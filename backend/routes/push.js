const router = require('express').Router();
const pool = require('../db');
const webpush = require('web-push');

// Configure web-push with VAPID keys
// These should be in environment variables in production
const vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY
};

// Only configure if keys exist
if (vapidKeys.publicKey && vapidKeys.privateKey) {
    webpush.setVapidDetails(
        'mailto:admin@nautilustech.pt',
        vapidKeys.publicKey,
        vapidKeys.privateKey
    );
}

// Get VAPID public key for frontend
router.get('/push/vapid-public-key', (req, res) => {
    if (!vapidKeys.publicKey) {
        return res.status(500).json({ error: 'VAPID keys not configured' });
    }
    res.json({ publicKey: vapidKeys.publicKey });
});

// Subscribe to push notifications
router.post('/push/subscribe', async (req, res) => {
    const { userId, subscription } = req.body;

    if (!userId || !subscription) {
        return res.status(400).json({ error: 'userId and subscription are required' });
    }

    const { endpoint, keys } = subscription;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: 'Invalid subscription object' });
    }

    try {
        // Upsert subscription (update if endpoint exists, insert if not)
        await pool.query(`
            INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, updated_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (endpoint) 
            DO UPDATE SET user_id = $1, p256dh = $3, auth = $4, updated_at = NOW()
        `, [userId, endpoint, keys.p256dh, keys.auth]);

        res.json({ success: true, message: 'Subscription saved' });
    } catch (err) {
        console.error('Error saving subscription:', err.message);
        res.status(500).json({ error: 'Failed to save subscription' });
    }
});

// Unsubscribe from push notifications
router.post('/push/unsubscribe', async (req, res) => {
    const { endpoint } = req.body;

    if (!endpoint) {
        return res.status(400).json({ error: 'endpoint is required' });
    }

    try {
        await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
        res.json({ success: true, message: 'Subscription removed' });
    } catch (err) {
        console.error('Error removing subscription:', err.message);
        res.status(500).json({ error: 'Failed to remove subscription' });
    }
});

// Helper function to send notification to a specific user
const sendNotificationToUser = async (userId, payload) => {
    if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
        console.warn('VAPID keys not configured, skipping push notification');
        return { sent: 0, failed: 0 };
    }

    try {
        const result = await pool.query(
            'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
            [userId]
        );

        let sent = 0;
        let failed = 0;

        for (const sub of result.rows) {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            };

            try {
                await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
                sent++;
            } catch (err) {
                console.error('Error sending push to', sub.endpoint, err.message);
                failed++;
                
                // Remove invalid subscriptions (410 Gone or 404 Not Found)
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
                }
            }
        }

        return { sent, failed };
    } catch (err) {
        console.error('Error fetching subscriptions:', err.message);
        return { sent: 0, failed: 0 };
    }
};

// Helper function to send notification to all users in a department
const sendNotificationToDepartment = async (departmentId, payload, excludeUserId = null) => {
    if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
        console.warn('VAPID keys not configured, skipping push notification');
        return { sent: 0, failed: 0 };
    }

    try {
        // Get all subscriptions for users in this department
        let query = `
            SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth, ps.user_id
            FROM push_subscriptions ps
            JOIN user_departments ud ON ps.user_id = ud.user_id
            WHERE ud.department_id = $1
        `;
        const params = [departmentId];

        if (excludeUserId) {
            query += ' AND ps.user_id != $2';
            params.push(excludeUserId);
        }

        const result = await pool.query(query, params);

        let sent = 0;
        let failed = 0;

        for (const sub of result.rows) {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            };

            try {
                await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
                sent++;
            } catch (err) {
                console.error('Error sending push:', err.message);
                failed++;
                
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
                }
            }
        }

        return { sent, failed };
    } catch (err) {
        console.error('Error sending department notification:', err.message);
        return { sent: 0, failed: 0 };
    }
};

// Helper function to send notification to multiple departments
const sendNotificationToDepartments = async (departmentIds, payload) => {
    if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
        console.warn('VAPID keys not configured, skipping push notification');
        return { sent: 0, failed: 0 };
    }

    try {
        const result = await pool.query(`
            SELECT DISTINCT ps.id, ps.endpoint, ps.p256dh, ps.auth
            FROM push_subscriptions ps
            JOIN user_departments ud ON ps.user_id = ud.user_id
            WHERE ud.department_id = ANY($1)
        `, [departmentIds]);

        let sent = 0;
        let failed = 0;

        for (const sub of result.rows) {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            };

            try {
                await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
                sent++;
            } catch (err) {
                console.error('Error sending push:', err.message);
                failed++;
                
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
                }
            }
        }

        return { sent, failed };
    } catch (err) {
        console.error('Error sending departments notification:', err.message);
        return { sent: 0, failed: 0 };
    }
};

// Export helpers for use in other routes
router.sendNotificationToUser = sendNotificationToUser;
router.sendNotificationToDepartment = sendNotificationToDepartment;
router.sendNotificationToDepartments = sendNotificationToDepartments;

module.exports = router;
