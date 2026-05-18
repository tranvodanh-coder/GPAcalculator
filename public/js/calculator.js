// Frontend Calculator Logic cho việc quy đổi điểm và dự đoán

/**
 * Quy đổi điểm hệ 10 sang chữ và hệ 4 theo thang:
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

/**
 * Tính toán CPA/GPA tổng quan từ mảng môn học
 */
function calculateOverall(subjects) {
    let totalCredits = 0;
    let totalScore10 = 0;
    let totalScore4 = 0;

    subjects.forEach(sub => {
        const credits = parseInt(sub.credits);
        const score10 = parseFloat(sub.score);
        const { score4 } = convertScore(score10);

        totalCredits += credits;
        totalScore10 += score10 * credits;
        totalScore4 += score4 * credits;
    });

    if (totalCredits === 0) return { totalCredits: 0, cpa10: 0, cpa4: 0 };

    return {
        totalCredits,
        cpa10: (totalScore10 / totalCredits).toFixed(2),
        cpa4: (totalScore4 / totalCredits).toFixed(2)
    };
}

/**
 * Tính GPA theo từng học kỳ
 * Trả về object: { "Kỳ 1": { gpa10, gpa4 }, "Kỳ 2": ... }
 */
function calculateBySemester(subjects) {
    const semesters = {};

    subjects.forEach(sub => {
        if (!semesters[sub.semester]) {
            semesters[sub.semester] = { totalCredits: 0, totalScore10: 0, totalScore4: 0 };
        }
        
        const credits = parseInt(sub.credits);
        const score10 = parseFloat(sub.score);
        const { score4 } = convertScore(score10);

        semesters[sub.semester].totalCredits += credits;
        semesters[sub.semester].totalScore10 += score10 * credits;
        semesters[sub.semester].totalScore4 += score4 * credits;
    });

    const result = {};
    for (const [sem, data] of Object.entries(semesters)) {
        result[sem] = {
            gpa10: (data.totalScore10 / data.totalCredits).toFixed(2),
            gpa4: (data.totalScore4 / data.totalCredits).toFixed(2)
        };
    }

    return result;
}

/**
 * Dự đoán điểm trung bình cần đạt cho các tín chỉ còn lại để đạt mục tiêu
 * Công thức: Target_CPA = (Current_Score + Future_Score) / (Current_Credits + Future_Credits)
 * => Future_Score = Target_CPA * (Current_Credits + Future_Credits) - Current_Score
 * => Required_Avg_Score = Future_Score / Future_Credits
 */
function predictRequiredScore(currentCpa4, currentCredits, targetCpa4, remainingCredits) {
    if (remainingCredits <= 0) return null;
    
    const currentTotalScore = parseFloat(currentCpa4) * currentCredits;
    const targetTotalScore = parseFloat(targetCpa4) * (currentCredits + parseInt(remainingCredits));
    
    const futureTotalScore = targetTotalScore - currentTotalScore;
    const requiredAvgScore = futureTotalScore / parseInt(remainingCredits);
    
    return requiredAvgScore.toFixed(2);
}

// Export cho browser
window.calculator = {
    convertScore,
    calculateOverall,
    calculateBySemester,
    predictRequiredScore
};
