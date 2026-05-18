document.addEventListener('DOMContentLoaded', () => {
    // Nếu đã có token, chuyển hướng sang dashboard
    if (localStorage.getItem('token')) {
        window.location.href = '/dashboard.html';
    }

    const loginForm = document.getElementById('loginForm');
    const toggleModeBtn = document.getElementById('toggleModeBtn');
    const submitBtn = document.getElementById('submitBtn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const toggleTextMsg = document.getElementById('toggleTextMsg');

    let isLoginMode = true;

    // Chuyển đổi giữa Đăng nhập và Đăng ký
    toggleModeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        if (isLoginMode) {
            submitBtn.textContent = 'Đăng Nhập';
            toggleTextMsg.textContent = 'Chưa có tài khoản?';
            toggleModeBtn.textContent = 'Đăng ký ngay';
        } else {
            submitBtn.textContent = 'Đăng Ký';
            toggleTextMsg.textContent = 'Đã có tài khoản?';
            toggleModeBtn.textContent = 'Đăng nhập';
        }
    });

    // Xử lý Submit Form
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!username || !password) {
            showToast('Vui lòng nhập đầy đủ thông tin', 'error');
            return;
        }

        // Đổi trạng thái button thành Loading
        const originalText = submitBtn.textContent;
        submitBtn.innerHTML = `<svg class="animate-spin h-5 w-5 mr-3 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Đang xử lý...`;
        submitBtn.disabled = true;

        try {
            const endpoint = isLoginMode ? '/auth/login' : '/auth/register';
            const data = await apiFetch(endpoint, {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            showToast(data.message, 'success');

            if (isLoginMode) {
                // Lưu token và user info
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                // Chuyển hướng
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 1000);
            } else {
                // Đăng ký xong -> Chuyển về chế độ đăng nhập
                isLoginMode = true;
                submitBtn.textContent = 'Đăng Nhập';
                toggleTextMsg.textContent = 'Chưa có tài khoản?';
                toggleModeBtn.textContent = 'Đăng ký ngay';
                passwordInput.value = '';
            }
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
});
