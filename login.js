const apiUrl = '/api'; // relative — works for both local dev and production

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(message, type = 'error') {
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-circle-check'
                : type === 'info'    ? 'fa-circle-info'
                :                     'fa-circle-exclamation';
    el.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}

document.addEventListener('DOMContentLoaded', () => {
    // Redirect if already logged in
    if (localStorage.getItem('token')) {
        window.location.replace('/clipboard.html');
        return;
    }

    // Password toggle
    const toggleBtn  = document.getElementById('togglePassword');
    const passInput  = document.getElementById('password');
    const passIcon   = document.getElementById('passwordIcon');
    toggleBtn?.addEventListener('click', () => {
        const isPassword = passInput.type === 'password';
        passInput.type   = isPassword ? 'text' : 'password';
        passIcon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
    });

    // Login form
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const username   = document.getElementById('username').value.trim();
        const password   = document.getElementById('password').value;
        const submitBtn  = document.getElementById('submitBtn');
        const submitLabel = document.getElementById('submitLabel');

        if (!username || !password) return toast('Please fill in all fields.');

        submitBtn.disabled = true;
        submitLabel.textContent = 'Signing in…';

        try {
            const res  = await fetch(`${apiUrl}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();

            if (res.ok && data.token) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('username', username);
                toast('Signed in! Redirecting…', 'success');
                setTimeout(() => window.location.href = '/clipboard.html', 1000);
            } else {
                toast(data.message || 'Invalid username or password.');
                submitBtn.disabled = false;
                submitLabel.textContent = 'Sign In';
            }
        } catch {
            toast('Network error. Please try again.');
            submitBtn.disabled = false;
            submitLabel.textContent = 'Sign In';
        }
    });
});
