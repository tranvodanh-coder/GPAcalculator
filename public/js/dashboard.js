document.addEventListener('DOMContentLoaded', () => {
    // Auth Check
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
        window.location.href = '/';
        return;
    }

    const user = JSON.parse(userStr);
    document.getElementById('userNameDisplay').textContent = `Xin chào, ${user.username}`;

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    });

    // Global State
    let subjects = [];
    let gpaChartInstance = null;

    // DOM Elements
    const subjectForm = document.getElementById('subjectForm');
    const tbody = document.getElementById('subjectTableBody');
    const emptyState = document.getElementById('emptyState');
    
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const saveSubBtn = document.getElementById('saveSubBtn');

    // Khởi tạo data
    fetchSubjects();

    // --- API Calls ---

    async function fetchSubjects() {
        try {
            const data = await apiFetch('/subjects');
            // Sắp xếp theo năm (4 chữ số) rồi đến kỳ (số)
            subjects = data.sort((a, b) => {
                const matchA = a.semester.match(/(\d+).*?(\d{4})/);
                const matchB = b.semester.match(/(\d+).*?(\d{4})/);
                
                if (matchA && matchB) {
                    const semA = parseInt(matchA[1], 10);
                    const yearA = parseInt(matchA[2], 10);
                    const semB = parseInt(matchB[1], 10);
                    const yearB = parseInt(matchB[2], 10);
                    
                    if (yearA !== yearB) return yearA - yearB; // Xếp năm trước
                    return semA - semB; // Năm bằng nhau thì xếp kỳ
                }
                return a.semester.localeCompare(b.semester); // Fallback
            });
            renderAll();
        } catch (error) {
            showToast('Lỗi khi tải dữ liệu: ' + error.message, 'error');
        }
    }

    subjectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('subjectId').value;
        const payload = {
            name: document.getElementById('subName').value.trim(),
            credits: parseInt(document.getElementById('subCredits').value),
            score: parseFloat(document.getElementById('subScore').value),
            semester: document.getElementById('subSemester').value.trim()
        };

        saveSubBtn.disabled = true;

        try {
            if (id) {
                // Update
                await apiFetch(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
                showToast('Cập nhật thành công');
            } else {
                // Create
                await apiFetch('/subjects', { method: 'POST', body: JSON.stringify(payload) });
                showToast('Thêm môn học thành công');
            }
            resetForm();
            await fetchSubjects(); // Cập nhật lại toàn bộ
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            saveSubBtn.disabled = false;
        }
    });

    window.editSubject = (id) => {
        const sub = subjects.find(s => s.id === id);
        if (!sub) return;
        
        document.getElementById('subjectId').value = sub.id;
        document.getElementById('subName').value = sub.name;
        document.getElementById('subCredits').value = sub.credits;
        document.getElementById('subScore').value = sub.score;
        document.getElementById('subSemester').value = sub.semester;

        saveSubBtn.textContent = 'Cập Nhật';
        cancelEditBtn.classList.remove('hidden');
    };

    window.deleteSubject = async (id) => {
        if (!confirm('Bạn có chắc muốn xóa môn học này?')) return;
        
        try {
            await apiFetch(`/subjects/${id}`, { method: 'DELETE' });
            showToast('Đã xóa môn học');
            await fetchSubjects();
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    cancelEditBtn.addEventListener('click', resetForm);

    function resetForm() {
        subjectForm.reset();
        document.getElementById('subjectId').value = '';
        saveSubBtn.textContent = 'Lưu Môn Học';
        cancelEditBtn.classList.add('hidden');
    }

    // --- Renders ---

    function renderAll() {
        renderTable();
        renderStats();
        renderChart();
        // Xoá dự đoán cũ nếu có
        document.getElementById('predictionResult').classList.add('hidden');
    }

    function renderTable() {
        tbody.innerHTML = '';
        if (subjects.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        
        subjects.forEach(sub => {
            const { letter, score4 } = calculator.convertScore(sub.score);
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${sub.semester}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${sub.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">${sub.credits}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600 text-center">${sub.score}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 font-bold text-center">${score4} (${letter})</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-right space-x-2">
                    <button onclick="editSubject(${sub.id})" class="text-indigo-600 hover:text-indigo-900">Sửa</button>
                    <button onclick="deleteSubject(${sub.id})" class="text-red-600 hover:text-red-900">Xóa</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderStats() {
        const stats = calculator.calculateOverall(subjects);
        document.getElementById('totalCredits').textContent = stats.totalCredits;
        document.getElementById('cpa10').textContent = stats.cpa10;
        document.getElementById('cpa4').textContent = stats.cpa4;
    }

    function renderChart() {
        const semesterData = calculator.calculateBySemester(subjects);
        const labels = Object.keys(semesterData);
        const gpa4Data = labels.map(sem => parseFloat(semesterData[sem].gpa4));

        const ctx = document.getElementById('gpaChart').getContext('2d');
        
        if (gpaChartInstance) {
            gpaChartInstance.destroy();
        }

        gpaChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'GPA (Hệ 4)',
                    data: gpa4Data,
                    borderColor: 'rgb(99, 102, 241)',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgb(99, 102, 241)',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 0,
                        max: 4.0,
                        ticks: { stepSize: 0.5 }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` GPA: ${context.parsed.y}`;
                            }
                        }
                    }
                }
            }
        });
    }

    // --- Dự báo & Lộ trình ---
    document.getElementById('predictBtn').addEventListener('click', () => {
        const targetCpa = parseFloat(document.getElementById('targetCpa').value);
        const remainingCredits = parseInt(document.getElementById('remainingCredits').value);
        
        const resultBox = document.getElementById('predictionResult');

        if (isNaN(targetCpa) || isNaN(remainingCredits) || targetCpa <= 0 || remainingCredits <= 0) {
            resultBox.innerHTML = '<span class="text-red-500 font-medium">Vui lòng nhập đúng số liệu mục tiêu.</span>';
            resultBox.classList.remove('hidden');
            return;
        }

        const stats = calculator.calculateOverall(subjects);
        if (stats.totalCredits === 0) {
            resultBox.innerHTML = '<span class="text-orange-500 font-medium">Bạn cần nhập ít nhất 1 môn học trước khi dự báo.</span>';
            resultBox.classList.remove('hidden');
            return;
        }

        const required = calculator.predictRequiredScore(stats.cpa4, stats.totalCredits, targetCpa, remainingCredits);

        if (required > 4.0) {
            resultBox.innerHTML = `
                <strong class="text-red-600 block mb-1">Mục tiêu quá cao! 😢</strong>
                Bạn cần điểm trung bình <strong>${required} / 4.0</strong> cho ${remainingCredits} tín chỉ còn lại. Điều này là <strong>Bất Khả Thi</strong>.<br>
                <em class="text-xs text-gray-500 mt-2 block">Gợi ý: Hãy cân nhắc hạ mục tiêu hoặc học cải thiện các môn tín chỉ cao bị điểm kém.</em>
            `;
        } else if (required <= 0) {
            resultBox.innerHTML = `
                <strong class="text-emerald-600 block mb-1">Bạn đã an toàn! 🎉</strong>
                Kể cả khi điểm trung bình các môn sau là 0, bạn vẫn có thể đạt mục tiêu. Hãy giữ vững phong độ nhé!
            `;
        } else {
            resultBox.innerHTML = `
                <strong class="text-indigo-700 block mb-1">Khả thi! 🚀</strong>
                Để đạt CPA <strong>${targetCpa}</strong>, bạn cần duy trì GPA trung bình ít nhất <strong>${required}</strong> / 4.0 cho <strong>${remainingCredits}</strong> tín chỉ còn lại.
                <br><br>
                <span class="text-xs font-semibold bg-indigo-50 text-indigo-600 px-2 py-1 rounded border border-indigo-100 block mt-2">
                    💡 AI Gợi ý: Hãy ưu tiên học thật chắc các môn chuyên ngành (thường có 3-4 tín chỉ) vì chúng ảnh hưởng rất mạnh đến tổng điểm.
                </span>
            `;
        }
        
        resultBox.classList.remove('hidden');
    });

});
