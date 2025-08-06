const apiUrl = 'https://copythingz.shop/api';

document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const passwordIcon = document.getElementById('passwordIcon');

    if (toggleButton && passwordInput && passwordIcon) {
        toggleButton.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            passwordIcon.classList.toggle('fa-eye', !isPassword);
            passwordIcon.classList.toggle('fa-eye-slash', isPassword);
        });
    }

    const form = document.getElementById('registerForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value.trim();

        if (!username || !password || !confirmPassword) {
            return showNotification('All fields are required.', 'error');
        }

        if (password !== confirmPassword) {
            return showNotification('Passwords do not match.', 'error');
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            const res = await fetch(`${apiUrl}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                showNotification('Registration successful! Redirecting...', 'success');
                setTimeout(() => window.location.href = '/login.html', 2000);
            } else {
                showNotification(data.message || 'Registration failed.', 'error');
            }
        } catch (err) {
            console.error('Registration error:', err);
            showNotification('An error occurred. Please try again.', 'error');
        } finally {
            submitBtn.disabled = false;
        }
    });
});

// Show toast-style message
function showNotification(message, type = 'error') {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-white ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;

    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 3000);
}
