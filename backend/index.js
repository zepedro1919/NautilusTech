const express = require('express');
const cors = require('cors');
const pool = require('./db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
// Allow request from local frontend and railway frontend aswell
app.use(cors({
    origin: [
        'http://localhost:5173', // Local Vite
        process.env.FRONTEND_URL // We will set this in Railway later
    ],
    credentials: true
}));
app.use(express.json());

// LOGIN ROUTE
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // 1. Check if user exists
    const userQuery = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (userQuery.rows.length === 0) {
      return res.status(401).json({ error: "Utilizador não encontrado" });
    }

    const user = userQuery.rows[0];

    // 2. Check Password (SIMPLE COMPARISON for now, as per your request)
    // Note: In production, use bcrypt.compare(password, user.password)
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});