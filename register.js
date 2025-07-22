document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const confirmPassword = document.getElementById('confirm-password').value.trim();

    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    try {
        const res = await fetch('https://copythingz.shop/api/register', {
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
            throw new Error(data.message || 'Registration failed');
        }

        alert(data.message || 'Registered successfully');
        window.location.href = 'login.html';
    } catch (err) {
        console.error('Registration error:', err);
        alert(err.message || 'Something went wrong');
    }
});
