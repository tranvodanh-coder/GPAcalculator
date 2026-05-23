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

    // DOM Elements for Grade Breakdown
    const componentsContainer = document.getElementById('componentsContainer');
    const addComponentBtn = document.getElementById('addComponentBtn');
    const totalWeightIndicator = document.getElementById('totalWeightIndicator');
    const tempGpaDisplay = document.getElementById('tempGpaDisplay');

    // Tạo một hàng nhập đầu điểm thành phần
    function createComponentRow(name = '', score = '', weight = '') {
        const row = document.createElement('div');
        row.className = 'component-row grid grid-cols-12 gap-2 items-end bg-gray-50/50 p-2 rounded-lg border border-gray-100 relative group';
        row.innerHTML = `
            <div class="col-span-5">
                <label class="block text-[10px] font-medium text-gray-400 mb-0.5">Tên thành phần</label>
                <input type="text" placeholder="VD: Giữa kỳ" required value="${name}" class="comp-name block w-full px-2 py-1 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 text-xs">
            </div>
            <div class="col-span-3">
                <label class="block text-[10px] font-medium text-gray-400 mb-0.5">Điểm (0-10)</label>
                <input type="number" step="0.1" min="0" max="10" placeholder="0-10" required value="${score}" class="comp-score block w-full px-2 py-1 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 text-xs">
            </div>
            <div class="col-span-3">
                <label class="block text-[10px] font-medium text-gray-400 mb-0.5">Trọng số (%)</label>
                <input type="number" min="0" max="100" placeholder="%" required value="${weight}" class="comp-weight block w-full px-2 py-1 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 text-xs">
            </div>
            <div class="col-span-1 text-center">
                <button type="button" class="remove-comp-btn text-red-500 hover:text-red-700 focus:outline-none py-1 px-1.5 rounded hover:bg-red-50 transition" title="Xóa đầu điểm">
                    <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
        `;

        // Gắn sự kiện tính điểm nhanh
        row.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', updateRealtimePreview);
        });

        // Gắn sự kiện nút xóa hàng
        row.querySelector('.remove-comp-btn').addEventListener('click', () => {
            row.remove();
            updateRealtimePreview();
        });

        componentsContainer.appendChild(row);
    }

    // Khởi tạo 3 đầu điểm mặc định
    function initializeDefaultComponents() {
        componentsContainer.innerHTML = '';
        createComponentRow('Chuyên cần', '', 10);
        createComponentRow('Giữa kỳ', '', 30);
        createComponentRow('Cuối kỳ', '', 60);
        updateRealtimePreview();
    }

    // Tính toán tổng trọng số và điểm GPA nháp realtime
    function updateRealtimePreview() {
        const rows = componentsContainer.querySelectorAll('.component-row');
        let totalWeight = 0;
        let totalWeightedScore = 0;

        rows.forEach(row => {
            const score = parseFloat(row.querySelector('.comp-score').value) || 0;
            const weight = parseFloat(row.querySelector('.comp-weight').value) || 0;
            totalWeight += weight;
            totalWeightedScore += score * weight;
        });

        totalWeightIndicator.textContent = `Tổng TS: ${totalWeight}%`;
        if (totalWeight === 100) {
            totalWeightIndicator.className = 'text-xs text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full font-medium';
        } else {
            totalWeightIndicator.className = 'text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full font-medium';
        }

        if (totalWeight > 0) {
            tempGpaDisplay.textContent = (totalWeightedScore / totalWeight).toFixed(2);
        } else {
            tempGpaDisplay.textContent = '0.00';
        }
    }

    // Sự kiện thêm đầu điểm
    addComponentBtn.addEventListener('click', () => {
        createComponentRow();
        updateRealtimePreview();
    });

    // Khởi tạo các đầu điểm mặc định ban đầu
    initializeDefaultComponents();

    // Khởi tạo data từ backend
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
        const rows = componentsContainer.querySelectorAll('.component-row');
        
        const components = [];
        let totalWeight = 0;

        for (let row of rows) {
            const name = row.querySelector('.comp-name').value.trim();
            const score = parseFloat(row.querySelector('.comp-score').value);
            const weight = parseFloat(row.querySelector('.comp-weight').value);

            if (!name) {
                showToast('Vui lòng nhập tên cho tất cả các đầu điểm!', 'error');
                return;
            }
            if (isNaN(score) || score < 0 || score > 10) {
                showToast('Điểm số phải từ 0 đến 10!', 'error');
                return;
            }
            if (isNaN(weight) || weight < 0 || weight > 100) {
                showToast('Trọng số phải từ 0 đến 100%!', 'error');
                return;
            }

            components.push({ name, score, weight });
            totalWeight += weight;
        }

        if (Math.round(totalWeight) !== 100) {
            showToast(`Tổng trọng số phải bằng 100%! Hiện tại đang là ${totalWeight}%`, 'error');
            return;
        }

        const payload = {
            name: document.getElementById('subName').value.trim(),
            credits: parseInt(document.getElementById('subCredits').value),
            semester: document.getElementById('subSemester').value.trim(),
            components: components
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
        document.getElementById('subSemester').value = sub.semester;

        // Render các đầu điểm động từ sub.components
        componentsContainer.innerHTML = '';
        if (sub.components && sub.components.length > 0) {
            sub.components.forEach(comp => {
                createComponentRow(comp.name, comp.score, comp.weight);
            });
        } else {
            // Fallback cho bản ghi cũ
            const scoreCc = sub.scoreCc !== null && sub.scoreCc !== undefined ? sub.scoreCc : 10;
            const weightCc = sub.weightCc !== null && sub.weightCc !== undefined ? sub.weightCc : 10;
            const scoreGk = sub.scoreGk !== null && sub.scoreGk !== undefined ? sub.scoreGk : 8;
            const weightGk = sub.weightGk !== null && sub.weightGk !== undefined ? sub.weightGk : 30;
            const scoreCk = sub.scoreCk !== null && sub.scoreCk !== undefined ? sub.scoreCk : 6;
            const weightCk = sub.weightCk !== null && sub.weightCk !== undefined ? sub.weightCk : 60;

            createComponentRow('Chuyên cần', scoreCc, weightCc);
            createComponentRow('Giữa kỳ', scoreGk, weightGk);
            createComponentRow('Cuối kỳ', scoreCk, weightCk);
        }

        updateRealtimePreview();

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
        initializeDefaultComponents();
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
            
            let breakdown = '';
            if (sub.components && sub.components.length > 0) {
                breakdown = `<div class="text-xs text-gray-400 mt-1">` + 
                    sub.components.map(comp => `${comp.name}: ${comp.score} (${comp.weight}%)`).join(' | ') + 
                    `</div>`;
            } else if (sub.scoreCc !== null && sub.scoreCc !== undefined) {
                breakdown = `<div class="text-xs text-gray-400 mt-1">CC: ${sub.scoreCc} (${sub.weightCc}%) | GK: ${sub.scoreGk} (${sub.weightGk}%) | CK: ${sub.scoreCk} (${sub.weightCk}%)</div>`;
            } else {
                breakdown = `<div class="text-xs text-gray-400 mt-1">Nhập trực tiếp (Cũ)</div>`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${sub.semester}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div>${sub.name}</div>
                    ${breakdown}
                </td>
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
