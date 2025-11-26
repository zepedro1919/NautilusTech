const router = require('express').Router();
const pool = require('../../db');
require('dotenv').config();

// ==================== MIDDLEWARE ====================
// Middleware to check if user is admin (belongs to RH or Administração department)
const isAdmin = async (req, res, next) => {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
        return res.status(401).json({ error: 'Não autorizado' });
    }

    try {
        // Check if user exists
        const userQuery = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        
        if (userQuery.rows.length === 0) {
            return res.status(401).json({ error: 'Utilizador não encontrado' });
        }

        const user = userQuery.rows[0];

        // Get user's departments from user_departments table
        const departmentsQuery = await pool.query(`
            SELECT d.name 
            FROM departments d
            JOIN user_departments ud ON d.id = ud.department_id
            WHERE ud.user_id = $1
        `, [userId]);
        
        const userDepartments = departmentsQuery.rows.map(d => d.name);
        
        // Check if user belongs to RH or Administração
        const isAdminUser = userDepartments.some(dept => 
            dept === 'RH' || dept === 'Administração' || dept === 'HR' || dept === 'Administration'
        );

        if (!isAdminUser) {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem aceder.' });
        }

        req.user = user;
        req.userDepartments = userDepartments;
        next();
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro do servidor' });
    }
};

// ==================== UTILITY FUNCTIONS ====================

// Generate username from name (e.g., "João Pedro Silva" -> "jpsilva")
function generateUsername(name) {
    const parts = name.trim().toLowerCase().split(/\s+/);
    
    if (parts.length === 1) {
        return parts[0].substring(0, 6);
    }
    
    const initials = parts.slice(0, -1).map(p => p.charAt(0)).join('');
    const lastName = parts[parts.length - 1];
    
    return initials + lastName;
}

// Generate random password (8 characters, alphanumeric)
function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Ensure username is unique
async function ensureUniqueUsername(baseUsername) {
    let username = baseUsername;
    let counter = 1;
    
    while (true) {
        const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (existing.rows.length === 0) {
            return username;
        }
        username = baseUsername + counter;
        counter++;
    }
}

// ==================== USERS ROUTES ====================

// GET all users (excluding password and username)
router.get('/admin/users', isAdmin, async (req, res) => {
    try {
        // Get users with their departments
        const result = await pool.query(`
            SELECT u.id, u.name, u.email, u.phone_number,
                   COALESCE(
                       (SELECT string_agg(d.name, ', ') 
                        FROM departments d 
                        JOIN user_departments ud ON d.id = ud.department_id 
                        WHERE ud.user_id = u.id), 
                       'Sem departamento'
                   ) as departments
            FROM users u
            ORDER BY u.name ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao carregar utilizadores' });
    }
});

// CREATE new user
router.post('/admin/users', isAdmin, async (req, res) => {
    const { name, email, phone } = req.body;

    if (!name || !email) {
        return res.status(400).json({ error: 'Nome e email são obrigatórios' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Formato de email inválido' });
    }

    try {
        const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (emailCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Este email já está registado' });
        }

        const baseUsername = generateUsername(name);
        const username = await ensureUniqueUsername(baseUsername);
        const password = generatePassword();

        const result = await pool.query(`
            INSERT INTO users (name, email, phone_number, username, password)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, name, email, phone_number
        `, [name, email, phone || null, username, password]);

        // TODO: Send email with credentials (integrate with SendGrid/Nodemailer)
        res.status(201).json({
            success: true,
            message: 'Utilizador criado com sucesso. Credenciais enviadas por email.',
            user: result.rows[0],
            credentials: { username, password, note: 'Estas credenciais devem ser enviadas por email ao utilizador' }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao criar utilizador' });
    }
});

// UPDATE user (only name, email, phone)
router.put('/admin/users/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    if (!name || !email) {
        return res.status(400).json({ error: 'Nome e email são obrigatórios' });
    }

    try {
        const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
        if (emailCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Este email já está em uso por outro utilizador' });
        }

        const result = await pool.query(`
            UPDATE users SET name = $1, email = $2, phone_number = $3 WHERE id = $4
            RETURNING id, name, email, phone_number
        `, [name, email, phone || null, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Utilizador não encontrado' });
        }

        res.json({ success: true, message: 'Utilizador atualizado com sucesso', user: result.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao atualizar utilizador' });
    }
});

// DELETE user
router.delete('/admin/users/:id', isAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        if (req.user.id === parseInt(id)) {
            return res.status(400).json({ error: 'Não pode eliminar a sua própria conta' });
        }

        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, name', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Utilizador não encontrado' });
        }

        res.json({ success: true, message: `Utilizador ${result.rows[0].name} eliminado com sucesso` });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao eliminar utilizador' });
    }
});

// ==================== DEPARTMENTS ROUTES ====================

router.get('/admin/departments', isAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM departments ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao carregar departamentos' });
    }
});

router.post('/admin/departments', isAdmin, async (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Nome do departamento é obrigatório' });
    }

    try {
        const existing = await pool.query('SELECT id FROM departments WHERE LOWER(name) = LOWER($1)', [name]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Já existe um departamento com este nome' });
        }

        const result = await pool.query(`
            INSERT INTO departments (name) VALUES ($1) RETURNING *
        `, [name]);

        res.status(201).json({ success: true, message: 'Departamento criado com sucesso', department: result.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao criar departamento' });
    }
});

router.put('/admin/departments/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Nome do departamento é obrigatório' });
    }

    try {
        const existing = await pool.query('SELECT id FROM departments WHERE LOWER(name) = LOWER($1) AND id != $2', [name, id]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Já existe outro departamento com este nome' });
        }

        const result = await pool.query(`
            UPDATE departments SET name = $1, description = $2 WHERE id = $3 RETURNING *
        `, [name, description || null, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Departamento não encontrado' });
        }

        res.json({ success: true, message: 'Departamento atualizado com sucesso', department: result.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao atualizar departamento' });
    }
});

router.delete('/admin/departments/:id', isAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const usersCheck = await pool.query('SELECT COUNT(*) FROM user_departments WHERE department_id = $1', [id]);
        if (parseInt(usersCheck.rows[0].count) > 0) {
            return res.status(400).json({ error: 'Não pode eliminar um departamento que tem utilizadores associados' });
        }

        const result = await pool.query('DELETE FROM departments WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Departamento não encontrado' });
        }

        res.json({ success: true, message: 'Departamento eliminado com sucesso' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao eliminar departamento' });
    }
});

// ==================== USER_DEPARTMENTS ROUTES ====================

router.get('/admin/user-departments', isAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT ud.user_id, ud.department_id,
                   u.name as user_name, u.email as user_email,
                   d.name as department_name
            FROM user_departments ud
            JOIN users u ON ud.user_id = u.id
            JOIN departments d ON ud.department_id = d.id
            ORDER BY u.name ASC, d.name ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao carregar atribuições' });
    }
});

router.post('/admin/user-departments', isAdmin, async (req, res) => {
    const { userId, departmentId } = req.body;

    if (!userId || !departmentId) {
        return res.status(400).json({ error: 'Utilizador e departamento são obrigatórios' });
    }

    try {
        const existing = await pool.query(
            'SELECT id FROM user_departments WHERE user_id = $1 AND department_id = $2',
            [userId, departmentId]
        );
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Utilizador já pertence a este departamento' });
        }

        const result = await pool.query(`
            INSERT INTO user_departments (user_id, department_id) VALUES ($1, $2) RETURNING *
        `, [userId, departmentId]);

        const fullInfo = await pool.query(`
            SELECT ud.id, ud.user_id, ud.department_id, u.name as user_name, d.name as department_name
            FROM user_departments ud
            JOIN users u ON ud.user_id = u.id
            JOIN departments d ON ud.department_id = d.id
            WHERE ud.id = $1
        `, [result.rows[0].id]);

        res.status(201).json({ success: true, message: 'Utilizador adicionado ao departamento', assignment: fullInfo.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao adicionar utilizador ao departamento' });
    }
});

router.delete('/admin/user-departments/:id', isAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM user_departments WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Atribuição não encontrada' });
        }

        res.json({ success: true, message: 'Utilizador removido do departamento' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao remover utilizador do departamento' });
    }
});

// ==================== ROOMS ROUTES (Admin) ====================

router.get('/admin/rooms', isAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM rooms ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao carregar salas' });
    }
});

router.post('/admin/rooms', isAdmin, async (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Nome da sala é obrigatório' });
    }

    try {
        const existing = await pool.query('SELECT id FROM rooms WHERE LOWER(name) = LOWER($1)', [name]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Já existe uma sala com este nome' });
        }

        const result = await pool.query(`
            INSERT INTO rooms (name) VALUES ($1) RETURNING *
        `, [name]);

        res.status(201).json({ success: true, message: 'Sala criada com sucesso', room: result.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao criar sala' });
    }
});

router.put('/admin/rooms/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Nome da sala é obrigatório' });
    }

    try {
        const result = await pool.query(`
            UPDATE rooms SET name = $1 WHERE id = $2 RETURNING *
        `, [name, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Sala não encontrada' });
        }

        res.json({ success: true, message: 'Sala atualizada com sucesso', room: result.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao atualizar sala' });
    }
});

router.delete('/admin/rooms/:id', isAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const reservationsCheck = await pool.query('SELECT COUNT(*) FROM reservations WHERE room_id = $1', [id]);
        if (parseInt(reservationsCheck.rows[0].count) > 0) {
            return res.status(400).json({ error: 'Não pode eliminar uma sala que tem reservas. Elimine as reservas primeiro.' });
        }

        const result = await pool.query('DELETE FROM rooms WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Sala não encontrada' });
        }

        res.json({ success: true, message: 'Sala eliminada com sucesso' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao eliminar sala' });
    }
});

// ==================== RESERVATIONS ROUTES (Admin) ====================

router.get('/admin/reservations', isAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.*, u.name as user_name, u.email as user_email, rm.name as room_name
            FROM reservations r
            JOIN users u ON r.user_id = u.id
            JOIN rooms rm ON r.room_id = rm.id
            ORDER BY r.reservation_date DESC, r.initial_time ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao carregar reservas' });
    }
});

router.delete('/admin/reservations/:id', isAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM reservations WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Reserva não encontrada' });
        }

        res.json({ success: true, message: 'Reserva eliminada com sucesso' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao eliminar reserva' });
    }
});

router.get('/admin/departments', isAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM departments ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao carregar salas' });
    }
});

module.exports = router;
