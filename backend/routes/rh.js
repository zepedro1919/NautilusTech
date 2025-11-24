const router = require('express').Router();
const pool = require('../db');
const nodemailer = require('nodemailer'); // Import Nodemailer
require('dotenv').config();

router.get('/rh/rooms', async (req, res) => {
    try {
        const allRooms = await pool.query("SELECT * FROM rooms ORDER BY name ASC");
        res.json(allRooms.rows);    // returns id, name
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.post('/rh/reservations', async (req, res) => {
    const { userId, roomId, date, startTime, endTime } = req.body;

    try {
        // 1. Validation (Existing)
        if (startTime >= endTime) {
            return res.status(400).json({ message: "A hora de início deve ser anterior à hora de fim." });
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

        // 3. Insert Reservation (Existing)
        const insertQuery = `
            INSERT INTO Reservations (user_id, room_id, reservation_date, initial_time, end_time)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const newReservation = await pool.query(insertQuery, [userId, roomId, date, startTime, endTime]);

        // ============================================================
        // 4. SEND EMAIL LOGIC
        // ============================================================
        try {
            // A. Fetch User Email and Room Name to make the email pretty
            const userRes = await pool.query("SELECT email, name FROM Users WHERE id = $1", [userId]);
            const roomRes = await pool.query("SELECT name FROM Rooms WHERE id = $1", [roomId]);
            
            const userEmail = userRes.rows[0]?.email;
            const userName = userRes.rows[0]?.name;
            const roomName = roomRes.rows[0]?.name;

            if (userEmail) {
                console.log(`[DEBUG] Configuring email transport. User: ${process.env.EMAIL_USER ? 'Set' : 'Not Set'}`);

                // B. Configure Transporter
                const transporter = nodemailer.createTransport({
                    host: 'smtp.gmail.com',
                    port: 587,
                    secure: false, // Use STARTTLS
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    },
                    tls: {
                        rejectUnauthorized: false
                    },
                    // Force IPv4 to avoid IPv6 timeouts in cloud environments
                    family: 4,
                    logger: true, // Log info to console
                    debug: true   // Include SMTP traffic in logs
                });

                // Verify connection configuration
                transporter.verify(function (error, success) {
                    if (error) {
                        console.error("[DEBUG] Transporter verification failed:", error);
                    } else {
                        console.log("[DEBUG] SMTP Server is ready to take our messages");
                    }
                });

                // C. Define Email Content
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: userEmail,
                    subject: 'Confirmação de Reserva - Nautilus Tech',
                    html: `
                        <h3>Olá, ${userName}</h3>
                        <p>A sua reserva foi confirmada com sucesso.</p>
                        <ul>
                            <li><strong>Sala:</strong> ${roomName}</li>
                            <li><strong>Data:</strong> ${date}</li>
                            <li><strong>Horário:</strong> ${startTime} às ${endTime}</li>
                        </ul>
                        <p>Obrigado,<br/>Equipa Nautilus Tech</p>
                    `
                };

                // D. Send - Don't await this, let it run in background so user doesn't wait
                console.log(`[DEBUG] Attempting to send email to ${userEmail}...`);
                transporter.sendMail(mailOptions)
                    .then(info => {
                        console.log(`[SUCCESS] Email enviado para ${userEmail}`);
                        console.log("[DEBUG] Message ID:", info.messageId);
                        console.log("[DEBUG] Response:", info.response);
                    })
                    .catch(err => {
                        console.error("[ERROR] Erro envio assíncrono:", err);
                        if (err.code === 'ETIMEDOUT') {
                            console.error("[ERROR] Connection timed out. Check firewall rules or port blocking.");
                        }
                    });
            }
        } catch (emailError) {
            // We log the error but DO NOT fail the request. 
            // The reservation was successful, even if the email failed.
            console.error("Erro ao enviar email:", emailError);
        }
        // ============================================================

        res.json({ success: true, reservation: newReservation.rows[0] });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.get('/rh/reservations', async (req, res) => {
    const { roomId, startDate, endDate } = req.query;
    try {
        // We JOIN with Users table to get the name of the person who booked
        const query = `
            SELECT r.*,u.name as user_name
            FROM Reservations r
            JOIN Users u ON r.user_id = u.id
            WHERE r.room_id = $1
            AND r.reservation_date >= $2
            AND r.reservation_date <= $3
        `;

        const result = await pool.query(query, [roomId, startDate, endDate]);
        res.json(result.rows);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;