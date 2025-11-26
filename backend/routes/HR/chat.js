const router = require('express').Router();
const pool = require('../../db');
const pushRoute = require('../push');

// Get all chat groups (departments) for a user
router.get('/rh/chat/groups', async (req, res) => {
    const { userId } = req.query;
    
    try {
        // Get all departments the user belongs to via user_departments table
        const query = `
            SELECT d.id, d.name
            FROM departments d
            JOIN user_departments ud ON d.id = ud.department_id
            WHERE ud.user_id = $1
            ORDER BY 
                CASE WHEN LOWER(d.name) = 'geral' THEN 0 ELSE 1 END,
                d.name
        `;
        
        const result = await pool.query(query, [userId]);
        
        // Map to group format with type indicator
        const groups = result.rows.map(dept => ({
            id: dept.id,
            name: dept.name,
            type: dept.name.toLowerCase() === 'geral' ? 'general' : 'department'
        }));

        res.json(groups);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Get messages for a specific department chat
router.get('/rh/chat/messages/:departmentId', async (req, res) => {
    const { departmentId } = req.params;
    const { limit = 50 } = req.query;

    try {
        const query = `
            SELECT m.id, m.user_id, m.department_id, m.message, m.created_at, u.name as user_name
            FROM chat_messages m
            JOIN users u ON m.user_id = u.id
            WHERE m.department_id = $1
            ORDER BY m.created_at DESC
            LIMIT $2
        `;
        
        const result = await pool.query(query, [departmentId, limit]);
        res.json(result.rows.reverse()); // Return in chronological order
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Post a new message to a department chat
router.post('/rh/chat/messages', async (req, res) => {
    const { userId, departmentId, message } = req.body;

    if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Mensagem não pode estar vazia' });
    }

    try {
        // Verify user belongs to this department
        const memberCheck = await pool.query(
            'SELECT 1 FROM user_departments WHERE user_id = $1 AND department_id = $2',
            [userId, departmentId]
        );
        
        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Não tem permissão para enviar mensagens neste grupo' });
        }

        const query = `
            INSERT INTO chat_messages (user_id, department_id, message)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        
        const result = await pool.query(query, [userId, departmentId, message.trim()]);
        
        // Get user name for the response
        const userQuery = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
        const userName = userQuery.rows[0].name;
        
        const newMessage = {
            ...result.rows[0],
            user_name: userName
        };

        // Get department name for notification
        const deptQuery = await pool.query('SELECT name FROM departments WHERE id = $1', [departmentId]);
        const deptName = deptQuery.rows[0]?.name || 'Chat';

        // Send push notification to all users in this department (except sender)
        pushRoute.sendNotificationToDepartment(departmentId, {
            title: `💬 ${deptName}`,
            body: `${userName}: ${message.trim().substring(0, 100)}`,
            icon: '/logo.png',
            badge: '/logo.png',
            tag: `chat-${departmentId}`,
            data: {
                type: 'chat',
                departmentId: departmentId,
                url: '/'
            }
        }, userId); // Exclude the sender

        res.json(newMessage);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
