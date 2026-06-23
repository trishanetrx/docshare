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
    const toggleBtn = document.getElementById('togglePassword');
    const passInput = document.getElementById('password');
    const passIcon  = document.getElementById('passwordIcon');
    toggleBtn?.addEventListener('click', () => {
        const isPassword = passInput.type === 'password';
        passInput.type   = isPassword ? 'text' : 'password';
        passIcon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
    });

    // Register form
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const username        = document.getElementById('username').value.trim();
        const password        = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const submitBtn       = document.getElementById('submitBtn');
        const submitLabel     = document.getElementById('submitLabel');

        if (!username || !password || !confirmPassword)
            return toast('Please fill in all fields.');
        if (password.length < 6)
            return toast('Password must be at least 6 characters.');
        if (password !== confirmPassword)
            return toast('Passwords do not match.');

        submitBtn.disabled = true;
        submitLabel.textContent = 'Creating account…';

        try {
            const res  = await fetch(`${apiUrl}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                toast('Account created! Redirecting to sign in…', 'success');
                setTimeout(() => window.location.href = '/login.html', 1200);
            } else {
                toast(data.message || 'Registration failed.');
                submitBtn.disabled = false;
                submitLabel.textContent = 'Create Account';
            }
        } catch {
            toast('Network error. Please try again.');
            submitBtn.disabled = false;
            submitLabel.textContent = 'Create Account';
        }
    });
});
