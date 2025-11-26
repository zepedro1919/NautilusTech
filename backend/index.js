const express = require('express');
const cors = require('cors');
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

// Routes
const loginRoute = require('./routes/auth');
const roomsRoute = require('./routes/HR/rooms');
const chatRoute = require('./routes/HR/chat');
const adminRoute = require('./routes/HR/admin');
const formsRoute = require('./routes/HR/forms');
const pushRoute = require('./routes/push');

app.use('/api', loginRoute);
app.use('/api', roomsRoute);
app.use('/api', chatRoute);
app.use('/api', adminRoute);
app.use('/api', formsRoute);
app.use('/api', pushRoute);

// Root Route
app.get('/', (req, res) => {
  res.send('Backend is running!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});