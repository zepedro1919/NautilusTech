const router = require('express').Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Matches POST /api/login
router.post('/login', async (req, res) => {
  const { username, password, module } = req.body;

  try {
    // 1. Check if user exists
    const userQuery = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (userQuery.rows.length === 0) {
      return res.status(401).json({ error: "Utilizador não encontrado" });
    }

    const user = userQuery.rows[0];

    // 2. Check Password (SIMPLE COMPARISON for now)
    if (password !== user.password) {
      return res.status(401).json({ error: "Password incorreta" });
    }

    // 3. Get user's departments from the many-to-many table
    const departmentsQuery = await pool.query(`
      SELECT d.id, d.name 
      FROM departments d
      JOIN user_departments ud ON d.id = ud.department_id
      WHERE ud.user_id = $1
    `, [user.id]);
    
    const userDepartments = departmentsQuery.rows.map(d => d.name);
    
    // Check if user is admin (belongs to RH or Administração)
    const isAdmin = userDepartments.some(dept => 
      dept === 'Recursos Humanos' || dept === 'Administração'
    );

    // 4. Check Module Access
    // HR module: everyone can access
    // Sales module: only Sales department users or admins can access
    // Production module: only Production department users or admins can access
    
    if (module === 'SALES' && !userDepartments.includes('Sales') && !isAdmin) {
      return res.status(403).json({ error: "Não tem permissão para aceder ao módulo NAUTILUS SALES" });
    }
    
    if (module === 'PRODUCTION' && !userDepartments.includes('Production') && !isAdmin) {
      return res.status(403).json({ error: "Não tem permissão para aceder ao módulo NAUTILUS PRODUCTION" });
    }

    // 5. Generate Token
    const token = jwt.sign({ 
      id: user.id, 
      name: user.name,
      departments: userDepartments,
      isAdmin: isAdmin
    }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        departments: userDepartments,
        isAdmin: isAdmin,
        module: module
      }
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;