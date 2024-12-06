document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();  // Prevent form from submitting normally

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Show loading or error message
    const statusMessage = document.getElementById('statusMessage');
    statusMessage.style.display = 'none';

    // Validate input
    if (!username || !password) {
        statusMessage.textContent = 'Please fill in both fields';
        statusMessage.style.display = 'block';
        statusMessage.style.color = 'red';
        return;
    }

    try {
        // Send the login request to the backend
        const response = await fetch('https://negombotech.com/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (response.ok) {
            // Save the token in localStorage
            localStorage.setItem('authToken', data.token);  // Save JWT token
            statusMessage.textContent = 'Login successful! Redirecting...';
            statusMessage.style.display = 'block';
            statusMessage.style.color = 'green';

            // Redirect to the protected page (e.g., dashboard.html)
            setTimeout(() => {
                window.location.href = '/dashboard.html';  // Redirect to your main dashboard page
            }, 2000);
        } else {
            statusMessage.textContent = data.message || 'Login failed';
            statusMessage.style.display = 'block';
            statusMessage.style.color = 'red';
        }
    } catch (error) {
        statusMessage.textContent = 'An error occurred while logging in.';
        statusMessage.style.display = 'block';
        statusMessage.style.color = 'red';
    }
});
