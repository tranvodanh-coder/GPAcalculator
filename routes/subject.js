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
        
        const parsedRows = rows.map(row => {
            let components = null;
            if (row.components) {
                try {
                    components = JSON.parse(row.components);
                } catch (e) {
                    components = null;
                }
            }
            
            // Fallback nếu chưa có trường components nhưng có cột điểm cũ
            if (!components && row.scoreCc !== null && row.scoreCc !== undefined) {
                components = [
                    { name: 'Chuyên cần', score: row.scoreCc, weight: row.weightCc },
                    { name: 'Giữa kỳ', score: row.scoreGk, weight: row.weightGk },
                    { name: 'Cuối kỳ', score: row.scoreCk, weight: row.weightCk }
                ];
            }
            
            return {
                ...row,
                components
            };
        });
        
        res.json(parsedRows);
    });
});

// Thêm môn học mới
router.post('/', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const { name, credits, semester, components } = req.body;

    if (!name || credits == null || !semester) {
        return res.status(400).json({ message: 'Vui lòng điền đủ thông tin môn học.' });
    }

    if (!components || !Array.isArray(components) || components.length === 0) {
        return res.status(400).json({ message: 'Vui lòng cung cấp danh sách đầu điểm thành phần.' });
    }

    // Xác thực danh sách đầu điểm
    let totalWeight = 0;
    for (let comp of components) {
        if (!comp.name || comp.name.trim() === '') {
            return res.status(400).json({ message: 'Tên đầu điểm thành phần không được để trống.' });
        }
        const score = parseFloat(comp.score);
        const weight = parseFloat(comp.weight);

        if (isNaN(score) || score < 0 || score > 10) {
            return res.status(400).json({ message: `Điểm của thành phần "${comp.name}" phải nằm trong khoảng từ 0 đến 10.` });
        }
        if (isNaN(weight) || weight < 0 || weight > 100) {
            return res.status(400).json({ message: `Trọng số của thành phần "${comp.name}" phải nằm trong khoảng từ 0 đến 100%.` });
        }
        totalWeight += weight;
    }

    if (Math.round(totalWeight) !== 100) {
        return res.status(400).json({ message: 'Tổng trọng số của tất cả các điểm thành phần phải bằng đúng 100%.' });
    }

    // Tự động tính toán điểm GPA tổng kết (hệ 10)
    const totalWeightedScore = components.reduce((sum, comp) => sum + parseFloat(comp.score) * parseFloat(comp.weight), 0);
    const computedScore = Math.round((totalWeightedScore / 100) * 100) / 100;

    // Lấy 3 phần tử đầu để lưu vào các cột cũ (đảm bảo tương thích tối đa)
    const sCc = components[0] ? parseFloat(components[0].score) : null;
    const wCc = components[0] ? parseFloat(components[0].weight) : null;
    const sGk = components[1] ? parseFloat(components[1].score) : null;
    const wGk = components[1] ? parseFloat(components[1].weight) : null;
    const sCk = components[2] ? parseFloat(components[2].score) : null;
    const wCk = components[2] ? parseFloat(components[2].weight) : null;

    db.run(
        'INSERT INTO subjects (userId, name, credits, score, semester, scoreCc, weightCc, scoreGk, weightGk, scoreCk, weightCk, components) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, name, credits, computedScore, semester, sCc, wCc, sGk, wGk, sCk, wCk, JSON.stringify(components)],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Lỗi khi thêm môn học.' });
            }
            res.status(201).json({ 
                message: 'Thêm môn học thành công.',
                subject: { 
                    id: this.lastID, 
                    userId, 
                    name, 
                    credits, 
                    score: computedScore, 
                    semester,
                    scoreCc: sCc,
                    weightCc: wCc,
                    scoreGk: sGk,
                    weightGk: wGk,
                    scoreCk: sCk,
                    weightCk: wCk,
                    components
                }
            });
        }
    );
});

// Cập nhật môn học
router.put('/:id', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const subjectId = req.params.id;
    const { name, credits, semester, components } = req.body;

    if (!name || credits == null || !semester) {
        return res.status(400).json({ message: 'Vui lòng điền đủ thông tin môn học.' });
    }

    if (!components || !Array.isArray(components) || components.length === 0) {
        return res.status(400).json({ message: 'Vui lòng cung cấp danh sách đầu điểm thành phần.' });
    }

    // Xác thực danh sách đầu điểm
    let totalWeight = 0;
    for (let comp of components) {
        if (!comp.name || comp.name.trim() === '') {
            return res.status(400).json({ message: 'Tên đầu điểm thành phần không được để trống.' });
        }
        const score = parseFloat(comp.score);
        const weight = parseFloat(comp.weight);

        if (isNaN(score) || score < 0 || score > 10) {
            return res.status(400).json({ message: `Điểm của thành phần "${comp.name}" phải nằm trong khoảng từ 0 đến 10.` });
        }
        if (isNaN(weight) || weight < 0 || weight > 100) {
            return res.status(400).json({ message: `Trọng số của thành phần "${comp.name}" phải nằm trong khoảng từ 0 đến 100%.` });
        }
        totalWeight += weight;
    }

    if (Math.round(totalWeight) !== 100) {
        return res.status(400).json({ message: 'Tổng trọng số của tất cả các điểm thành phần phải bằng đúng 100%.' });
    }

    // Tự động tính toán điểm GPA tổng kết (hệ 10)
    const totalWeightedScore = components.reduce((sum, comp) => sum + parseFloat(comp.score) * parseFloat(comp.weight), 0);
    const computedScore = Math.round((totalWeightedScore / 100) * 100) / 100;

    // Lấy 3 phần tử đầu để lưu vào các cột cũ (đảm bảo tương thích tối đa)
    const sCc = components[0] ? parseFloat(components[0].score) : null;
    const wCc = components[0] ? parseFloat(components[0].weight) : null;
    const sGk = components[1] ? parseFloat(components[1].score) : null;
    const wGk = components[1] ? parseFloat(components[1].weight) : null;
    const sCk = components[2] ? parseFloat(components[2].score) : null;
    const wCk = components[2] ? parseFloat(components[2].weight) : null;

    db.run(
        'UPDATE subjects SET name = ?, credits = ?, score = ?, semester = ?, scoreCc = ?, weightCc = ?, scoreGk = ?, weightGk = ?, scoreCk = ?, weightCk = ?, components = ? WHERE id = ? AND userId = ?',
        [name, credits, computedScore, semester, sCc, wCc, sGk, wGk, sCk, wCk, JSON.stringify(components), subjectId, userId],
        function (err) {
            if (err) {
                console.error(err);
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
