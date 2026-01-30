document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    // Since we are in the admin folder now:
    // index.html is the login page
    // dashboard.html is the main admin page
    
    // Check if it's the index page (login) or root of admin
    const isLoginPage = path.endsWith('/admin/') || path.endsWith('/index.html') || path.endsWith('/admin');
    const isDashboardPage = path.includes('dashboard.html');

    // --- Login Page Logic ---
    if (isLoginPage && !isDashboardPage) {
        // If already logged in, redirect to dashboard
        if (localStorage.getItem('isLoggedIn') === 'true') {
            window.location.href = 'dashboard.html';
            return;
        }

        const loginForm = document.getElementById('loginForm');
        const errorMessage = document.getElementById('errorMessage');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const username = loginForm.username.value;
                const password = loginForm.password.value;

                // MOCK AUTHENTICATION
                if (username === 'admin' && password === 'admin123') {
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('user', username);
                    window.location.href = 'dashboard.html';
                } else {
                    errorMessage.classList.remove('hidden');
                    loginForm.classList.add('animate-pulse');
                    setTimeout(() => loginForm.classList.remove('animate-pulse'), 500);
                }
            });
        }
    }

    // --- Admin Dashboard Logic ---
    if (isDashboardPage) {
        // Check authentication
        if (localStorage.getItem('isLoggedIn') !== 'true') {
            window.location.href = 'index.html';
            return;
        }

        // Logout functionality
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('确定要退出登录吗？')) {
                    localStorage.removeItem('isLoggedIn');
                    localStorage.removeItem('user');
                    window.location.href = 'index.html';
                }
            });
        }
        console.log('Dashboard loaded for user:', localStorage.getItem('user'));
    }
});
