const router = require('express').Router();
const pool = require('../../db');
const pushRoute = require('../push');

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        return res.status(401).json({ error: 'Não autorizado' });
    }

    try {
        const result = await pool.query(`
            SELECT 1 FROM user_departments ud
            JOIN departments d ON ud.department_id = d.id
            WHERE ud.user_id = $1 
            AND LOWER(d.name) IN ('rh', 'administração', 'hr', 'administration')
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(403).json({ error: 'Acesso negado' });
        }
        next();
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro do servidor' });
    }
};

// ============ FORMS CRUD ============

// Get all forms (admin only)
router.get('/rh/admin/forms', isAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT f.*, u.name as created_by_name,
                   (SELECT COUNT(*) FROM form_responses WHERE form_id = f.id) as response_count,
                   ARRAY_AGG(DISTINCT d.name) as target_departments
            FROM forms f
            LEFT JOIN users u ON f.created_by = u.id
            LEFT JOIN form_departments fd ON f.id = fd.form_id
            LEFT JOIN departments d ON fd.department_id = d.id
            GROUP BY f.id, u.name
            ORDER BY f.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao carregar formulários' });
    }
});

// Get single form with questions (admin only)
router.get('/rh/admin/forms/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        // Get form
        const formResult = await pool.query(`
            SELECT f.*, u.name as created_by_name
            FROM forms f
            LEFT JOIN users u ON f.created_by = u.id
            WHERE f.id = $1
        `, [id]);

        if (formResult.rows.length === 0) {
            return res.status(404).json({ error: 'Formulário não encontrado' });
        }

        // Get questions
        const questionsResult = await pool.query(`
            SELECT * FROM form_questions
            WHERE form_id = $1
            ORDER BY question_order
        `, [id]);

        // Get target departments
        const deptResult = await pool.query(`
            SELECT d.id, d.name FROM form_departments fd
            JOIN departments d ON fd.department_id = d.id
            WHERE fd.form_id = $1
        `, [id]);

        res.json({
            ...formResult.rows[0],
            questions: questionsResult.rows,
            target_departments: deptResult.rows
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao carregar formulário' });
    }
});

// Create new form (admin only)
router.post('/rh/admin/forms', isAdmin, async (req, res) => {
    const { title, description, is_anonymous, expires_at, questions, department_ids, created_by } = req.body;

    if (!title || !questions || questions.length === 0) {
        return res.status(400).json({ error: 'Título e pelo menos uma pergunta são obrigatórios' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Create form
        const formResult = await client.query(`
            INSERT INTO forms (title, description, created_by, is_anonymous, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [title, description, created_by, is_anonymous || false, expires_at || null]);

        const formId = formResult.rows[0].id;

        // Add questions
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            await client.query(`
                INSERT INTO form_questions (form_id, question_text, question_type, options, is_required, question_order)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [formId, q.question_text, q.question_type, q.options ? JSON.stringify(q.options) : null, q.is_required || false, i + 1]);
        }

        // Add target departments
        if (department_ids && department_ids.length > 0) {
            for (const deptId of department_ids) {
                await client.query(`
                    INSERT INTO form_departments (form_id, department_id)
                    VALUES ($1, $2)
                `, [formId, deptId]);
            }

            // Send push notification to all target departments
            pushRoute.sendNotificationToDepartments(department_ids, {
                title: '📋 Novo Formulário',
                body: title,
                icon: '/logo.png',
                badge: '/logo.png',
                tag: `form-${formId}`,
                data: {
                    type: 'form',
                    formId: formId,
                    url: '/'
                }
            });
        }

        await client.query('COMMIT');
        res.json({ success: true, form: formResult.rows[0] });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao criar formulário' });
    } finally {
        client.release();
    }
});

// Update form (admin only)
router.put('/rh/admin/forms/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    const { title, description, is_active, is_anonymous, expires_at, questions, department_ids } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Update form
        await client.query(`
            UPDATE forms SET title = $1, description = $2, is_active = $3, is_anonymous = $4, expires_at = $5
            WHERE id = $6
        `, [title, description, is_active, is_anonymous, expires_at, id]);

        // Replace questions
        await client.query('DELETE FROM form_questions WHERE form_id = $1', [id]);
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            await client.query(`
                INSERT INTO form_questions (form_id, question_text, question_type, options, is_required, question_order)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [id, q.question_text, q.question_type, q.options ? JSON.stringify(q.options) : null, q.is_required || false, i + 1]);
        }

        // Replace target departments
        await client.query('DELETE FROM form_departments WHERE form_id = $1', [id]);
        if (department_ids && department_ids.length > 0) {
            for (const deptId of department_ids) {
                await client.query(`
                    INSERT INTO form_departments (form_id, department_id)
                    VALUES ($1, $2)
                `, [id, deptId]);
            }
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao atualizar formulário' });
    } finally {
        client.release();
    }
});

// Delete form (admin only)
router.delete('/rh/admin/forms/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM forms WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao eliminar formulário' });
    }
});

// Toggle form active status (admin only)
router.patch('/rh/admin/forms/:id/toggle', isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(`
            UPDATE forms SET is_active = NOT is_active WHERE id = $1 RETURNING is_active
        `, [id]);
        res.json({ success: true, is_active: result.rows[0].is_active });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao alterar estado do formulário' });
    }
});

// ============ RESPONSES ============

// Get responses for a form (admin only)
router.get('/rh/admin/forms/:id/responses', isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        // Get form info first to check if anonymous
        const formResult = await pool.query('SELECT is_anonymous FROM forms WHERE id = $1', [id]);
        const isAnonymous = formResult.rows[0]?.is_anonymous;

        // Get responses with answers
        const responsesResult = await pool.query(`
            SELECT fr.id, fr.submitted_at, 
                   ${isAnonymous ? "NULL" : "u.name"} as user_name,
                   ${isAnonymous ? "NULL" : "u.email"} as user_email
            FROM form_responses fr
            LEFT JOIN users u ON fr.user_id = u.id
            WHERE fr.form_id = $1
            ORDER BY fr.submitted_at DESC
        `, [id]);

        // Get all answers for these responses
        const responseIds = responsesResult.rows.map(r => r.id);
        let answers = [];
        if (responseIds.length > 0) {
            const answersResult = await pool.query(`
                SELECT fa.response_id, fa.question_id, fa.answer_text, fa.answer_options,
                       fq.question_text, fq.question_type
                FROM form_answers fa
                JOIN form_questions fq ON fa.question_id = fq.id
                WHERE fa.response_id = ANY($1)
            `, [responseIds]);
            answers = answersResult.rows;
        }

        // Get questions for reference
        const questionsResult = await pool.query(`
            SELECT id, question_text, question_type, options, question_order
            FROM form_questions WHERE form_id = $1 ORDER BY question_order
        `, [id]);

        // Combine data
        const responses = responsesResult.rows.map(response => ({
            ...response,
            answers: answers.filter(a => a.response_id === response.id)
        }));

        res.json({
            questions: questionsResult.rows,
            responses,
            is_anonymous: isAnonymous
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao carregar respostas' });
    }
});

// Export responses as CSV data (admin only)
router.get('/rh/admin/forms/:id/export', isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        // Get form
        const formResult = await pool.query('SELECT title, is_anonymous FROM forms WHERE id = $1', [id]);
        if (formResult.rows.length === 0) {
            return res.status(404).json({ error: 'Formulário não encontrado' });
        }
        const form = formResult.rows[0];

        // Get questions
        const questionsResult = await pool.query(`
            SELECT id, question_text, question_order
            FROM form_questions WHERE form_id = $1 ORDER BY question_order
        `, [id]);
        const questions = questionsResult.rows;

        // Get responses with user info
        const responsesResult = await pool.query(`
            SELECT fr.id, fr.submitted_at,
                   ${form.is_anonymous ? "NULL" : "u.name"} as user_name
            FROM form_responses fr
            LEFT JOIN users u ON fr.user_id = u.id
            WHERE fr.form_id = $1
            ORDER BY fr.submitted_at
        `, [id]);

        // Get all answers
        const responseIds = responsesResult.rows.map(r => r.id);
        let answers = [];
        if (responseIds.length > 0) {
            const answersResult = await pool.query(`
                SELECT response_id, question_id, answer_text, answer_options
                FROM form_answers WHERE response_id = ANY($1)
            `, [responseIds]);
            answers = answersResult.rows;
        }

        // Build export data
        const exportData = responsesResult.rows.map(response => {
            const row = {
                'Data de Submissão': new Date(response.submitted_at).toLocaleString('pt-PT'),
            };
            if (!form.is_anonymous) {
                row['Utilizador'] = response.user_name || 'Desconhecido';
            }
            questions.forEach(q => {
                const answer = answers.find(a => a.response_id === response.id && a.question_id === q.id);
                if (answer) {
                    row[q.question_text] = answer.answer_options 
                        ? (Array.isArray(answer.answer_options) ? answer.answer_options.join(', ') : answer.answer_options)
                        : (answer.answer_text || '');
                } else {
                    row[q.question_text] = '';
                }
            });
            return row;
        });

        res.json({
            title: form.title,
            data: exportData
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao exportar dados' });
    }
});

// ============ USER-FACING ENDPOINTS ============

// Get pending forms for a specific department (for chat view)
router.get('/rh/forms/pending', async (req, res) => {
    const { userId, departmentId } = req.query;
    try {
        const result = await pool.query(`
            SELECT DISTINCT f.id, f.title, f.description, f.is_anonymous, f.expires_at, f.created_at
            FROM forms f
            JOIN form_departments fd ON f.id = fd.form_id
            WHERE fd.department_id = $1
            AND f.is_active = true
            AND (f.expires_at IS NULL OR f.expires_at > NOW())
            AND NOT EXISTS (
                SELECT 1 FROM form_responses fr 
                WHERE fr.form_id = f.id AND fr.user_id = $2
            )
            ORDER BY f.created_at DESC
        `, [departmentId, userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao carregar formulários pendentes' });
    }
});

// Get forms available to current user
router.get('/rh/forms', async (req, res) => {
    const { userId } = req.query;
    try {
        const result = await pool.query(`
            SELECT DISTINCT f.id, f.title, f.description, f.is_anonymous, f.expires_at, f.created_at,
                   EXISTS(SELECT 1 FROM form_responses WHERE form_id = f.id AND user_id = $1) as has_responded
            FROM forms f
            JOIN form_departments fd ON f.id = fd.form_id
            JOIN user_departments ud ON fd.department_id = ud.department_id
            WHERE ud.user_id = $1
            AND f.is_active = true
            AND (f.expires_at IS NULL OR f.expires_at > NOW())
            ORDER BY f.created_at DESC
        `, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao carregar formulários' });
    }
});

// Get form for user to fill
router.get('/rh/forms/:id', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.query;

    try {
        // Check if user has access
        const accessCheck = await pool.query(`
            SELECT 1 FROM forms f
            JOIN form_departments fd ON f.id = fd.form_id
            JOIN user_departments ud ON fd.department_id = ud.department_id
            WHERE f.id = $1 AND ud.user_id = $2 AND f.is_active = true
        `, [id, userId]);

        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Sem acesso a este formulário' });
        }

        // Check if already responded
        const responseCheck = await pool.query(
            'SELECT 1 FROM form_responses WHERE form_id = $1 AND user_id = $2',
            [id, userId]
        );

        if (responseCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Já respondeu a este formulário' });
        }

        // Get form with questions
        const formResult = await pool.query('SELECT id, title, description, is_anonymous FROM forms WHERE id = $1', [id]);
        const questionsResult = await pool.query(`
            SELECT id, question_text, question_type, options, is_required, question_order
            FROM form_questions WHERE form_id = $1 ORDER BY question_order
        `, [id]);

        res.json({
            ...formResult.rows[0],
            questions: questionsResult.rows
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao carregar formulário' });
    }
});

// Submit form response
router.post('/rh/forms/:id/respond', async (req, res) => {
    const { id } = req.params;
    const { userId, answers } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if already responded
        const responseCheck = await client.query(
            'SELECT 1 FROM form_responses WHERE form_id = $1 AND user_id = $2',
            [id, userId]
        );

        if (responseCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Já respondeu a este formulário' });
        }

        // Create response
        const responseResult = await client.query(`
            INSERT INTO form_responses (form_id, user_id) VALUES ($1, $2) RETURNING id
        `, [id, userId]);
        const responseId = responseResult.rows[0].id;

        // Insert answers
        for (const answer of answers) {
            await client.query(`
                INSERT INTO form_answers (response_id, question_id, answer_text, answer_options)
                VALUES ($1, $2, $3, $4)
            `, [responseId, answer.question_id, answer.answer_text || null, answer.answer_options ? JSON.stringify(answer.answer_options) : null]);
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao submeter resposta' });
    } finally {
        client.release();
    }
});

module.exports = router;
