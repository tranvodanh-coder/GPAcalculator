const express = require('express');
const router = express.Router();
const db = require('../database');
const authenticateToken = require('../utils/authMiddleware');

// Lấy danh sách tất cả môn học của user hiện tại
router.get('/', authenticateToken, (req, res) => {
    const userId = req.user.userId;

    db.all('SELECT * FROM subjects WHERE userId = ? ORDER BY semester ASC, id ASC', [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Lỗi khi lấy danh sách môn học.' });
        }
        res.json(rows);
    });
});

// Thêm môn học mới
router.post('/', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const { name, credits, score, semester } = req.body;

    if (!name || credits == null || score == null || !semester) {
        return res.status(400).json({ message: 'Vui lòng điền đủ thông tin môn học.' });
    }

    db.run(
        'INSERT INTO subjects (userId, name, credits, score, semester) VALUES (?, ?, ?, ?, ?)',
        [userId, name, credits, score, semester],
        function (err) {
            if (err) {
                return res.status(500).json({ message: 'Lỗi khi thêm môn học.' });
            }
            res.status(201).json({ 
                message: 'Thêm môn học thành công.',
                subject: { id: this.lastID, userId, name, credits, score, semester }
            });
        }
    );
});

// Cập nhật môn học
router.put('/:id', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const subjectId = req.params.id;
    const { name, credits, score, semester } = req.body;

    db.run(
        'UPDATE subjects SET name = ?, credits = ?, score = ?, semester = ? WHERE id = ? AND userId = ?',
        [name, credits, score, semester, subjectId, userId],
        function (err) {
            if (err) {
                return res.status(500).json({ message: 'Lỗi khi cập nhật môn học.' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Không tìm thấy môn học hoặc bạn không có quyền sửa.' });
            }
            res.json({ message: 'Cập nhật môn học thành công.' });
        }
    );
});

// Xóa môn học
router.delete('/:id', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const subjectId = req.params.id;

    db.run(
        'DELETE FROM subjects WHERE id = ? AND userId = ?',
        [subjectId, userId],
        function (err) {
            if (err) {
                return res.status(500).json({ message: 'Lỗi khi xóa môn học.' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Không tìm thấy môn học hoặc bạn không có quyền xóa.' });
            }
            res.json({ message: 'Xóa môn học thành công.' });
        }
    );
});

module.exports = router;
