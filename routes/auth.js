const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Đăng ký (Register)
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ message: 'Vui lòng nhập đầy đủ username và password.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ message: 'Username đã tồn tại. Vui lòng chọn tên khác.' });
                }
                return res.status(500).json({ message: 'Lỗi server khi đăng ký.' });
            }
            res.status(201).json({ message: 'Đăng ký thành công.' });
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi mã hóa mật khẩu.' });
    }
});

// Đăng nhập (Login)
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Vui lòng nhập đầy đủ username và password.' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ message: 'Lỗi server khi đăng nhập.' });
        }
        if (!user) {
            return res.status(401).json({ message: 'Sai username hoặc mật khẩu.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Sai username hoặc mật khẩu.' });
        }

        // Tạo JWT Token
        const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });
        
        res.json({
            message: 'Đăng nhập thành công',
            token,
            user: { id: user.id, username: user.username }
        });
    });
});

module.exports = router;
