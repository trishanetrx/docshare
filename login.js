const BASE_URL = 'https://clipboard.copythingz.shop/api';

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    try {
        const res = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json().catch(() => {
            throw new Error('Invalid JSON response from server');
        });

        if (!res.ok) {
            throw new Error(data.message || 'Login failed');
        }

        localStorage.setItem('token', data.token);
        window.location.href = 'dashboard.html';
    } catch (err) {
        console.error('Login error:', err);
        alert(err.message || 'Something went wrong');
    }
});
