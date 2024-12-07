document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${apiUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            alert('Login successful! Redirecting...');
            window.location.href = '/clipboard.html';
        } else {
            alert(data.message || 'Login failed.');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred. Please try again.');
    }
});
