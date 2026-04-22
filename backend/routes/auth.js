const jwt = require('jsonwebtoken');

module.exports = (db, dbQuery) => {
    const router = require('express').Router();
    
    // REGISTER
    router.post('/register', async (req, res) => {
        const { username, email, password } = req.body;
        
        try {
            await dbQuery(
                'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                [username, email, password]
            );
            res.json({ success: true, message: 'Registrasi berhasil!' });
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                res.status(400).json({ success: false, message: 'Username atau email sudah terdaftar' });
            } else {
                res.status(500).json({ success: false, message: err.message });
            }
        }
    });
    
    // LOGIN
    router.post('/login', async (req, res) => {
        const { email, password, role } = req.body;
        const table = role === 'admin' ? 'admins' : 'users';
        
        try {
            const results = await dbQuery(`SELECT * FROM ${table} WHERE email = ?`, [email]);
            
            if (results.length === 0) {
                return res.status(401).json({ success: false, message: 'Email atau password salah' });
            }
            
            const user = results[0];
            
            // Langsung bandingkan (plain text)
            if (user.password !== password) {
                return res.status(401).json({ success: false, message: 'Email atau password salah' });
            }
            
            const token = jwt.sign(
                { id: user.id, role: role, username: user.username },
                'rahasia',
                { expiresIn: '7d' }
            );
            
            res.json({
                success: true,
                token,
                user: { id: user.id, username: user.username, email: user.email, role: role }
            });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
    
    return router;
};