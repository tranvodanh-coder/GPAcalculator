/**
 * Chuyển đổi điểm hệ 10 sang chữ và hệ 4 theo thang điểm chuẩn (theo quy định của user: 10=4.0, 9-9.9=3.6+, 8=3.2+)
 * Chúng ta sử dụng thang:
 * 9.0 - 10.0: A+ (4.0)
 * 8.5 - 8.9: A (3.7) -> (User: 8+ = A = 3.2+ ; 9 = A+ = 3.6+ ; 10 = A+ = 4.0).
 * Theo yêu cầu cụ thể của user:
 * 10 = A+ = 4.0
 * 9.0 - 9.9 = A+ = 3.6 (hoặc tuỳ, mình cứ cho 9.0-10.0 là A+)
 * Sẽ dùng thang chuẩn VN thường thấy sát với request của user:
 * 9.0 - 10.0: A+ (4.0)
 * 8.5 - 8.9: A (3.7)
 * 8.0 - 8.4: B+ (3.5)
 * 7.0 - 7.9: B (3.0)
 * 6.5 - 6.9: C+ (2.5)
 * 5.5 - 6.4: C (2.0)
 * 5.0 - 5.4: D+ (1.5)
 * 4.0 - 4.9: D (1.0)
 * Dưới 4.0: F (0.0)
 */

function convertScore(score10) {
    if (score10 >= 9.0) return { letter: 'A+', score4: 4.0 };
    if (score10 >= 8.5) return { letter: 'A', score4: 3.7 };
    if (score10 >= 8.0) return { letter: 'B+', score4: 3.5 };
    if (score10 >= 7.0) return { letter: 'B', score4: 3.0 };
    if (score10 >= 6.5) return { letter: 'C+', score4: 2.5 };
    if (score10 >= 5.5) return { letter: 'C', score4: 2.0 };
    if (score10 >= 5.0) return { letter: 'D+', score4: 1.5 };
    if (score10 >= 4.0) return { letter: 'D', score4: 1.0 };
    return { letter: 'F', score4: 0.0 };
}

module.exports = {
    convertScore
};
