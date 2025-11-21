const router = require('express').Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Matches POST /api/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

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

    // 3. Generate Token
    const token = jwt.sign({ id: user.id, name: user.name }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;