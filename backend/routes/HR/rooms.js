const router = require('express').Router();
const pool = require('../../db');
require('dotenv').config();

router.get('/hr/rooms', async (req, res) => {
    try {
        const allRooms = await pool.query("SELECT * FROM rooms ORDER BY name ASC");
        res.json(allRooms.rows);    // returns id, name
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.post('/hr/reservations', async (req, res) => {
    const { userId, roomId, date, startTime, endTime, description } = req.body;

    try {
        // 1. Validation (Existing)
        if (startTime >= endTime) {
            return res.status(400).json({ message: "A hora de início deve ser anterior à hora de fim." });
        }

        // Validate description length if provided
        if (description && description.length > 50) {
            return res.status(400).json({ message: "A descrição não pode exceder 50 caracteres." });
        }

        // 2. Conflict Check (Existing)
        const conflictQuery = `
            SELECT * FROM reservations
            WHERE room_id = $1
            AND reservation_date = $2
            AND (initial_time < $4 AND end_time > $3)
        `;
        const conflict = await pool.query(conflictQuery, [roomId, date, startTime, endTime]);

        if (conflict.rows.length > 0) {
            return res.status(409).json({
                success: false, 
                message: "Esta sala já tem reserva para esta data e hora." 
            });
        }

        // 3. Insert Reservation with optional description
        const insertQuery = `
            INSERT INTO Reservations (user_id, room_id, reservation_date, initial_time, end_time, description)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const newReservation = await pool.query(insertQuery, [userId, roomId, date, startTime, endTime, description || null]);

        res.json({ success: true, reservation: newReservation.rows[0] });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.get('/hr/reservations', async (req, res) => {
    const { roomId, startDate, endDate } = req.query;
    try {
        // We JOIN with Users table to get the name of the person who booked
        const query = `
            SELECT r.*, u.name as user_name
            FROM Reservations r
            JOIN Users u ON r.user_id = u.id
            WHERE r.room_id = $1
            AND r.reservation_date >= $2
            AND r.reservation_date <= $3
            ORDER BY r.initial_time ASC
        `;

        const result = await pool.query(query, [roomId, startDate, endDate]);
        res.json(result.rows);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.delete('/hr/reservations/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await pool.query(
            'DELETE FROM reservations WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Reserva não encontrada' });
        }

        res.json({ success: true, message: 'Reserva cancelada com sucesso' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Erro ao cancelar reserva' });
    }
});

module.exports = router;