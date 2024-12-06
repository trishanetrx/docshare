const apiUrl = 'https://negombotech.com/api'; // Backend API URL

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent default form submission behavior

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        // Send POST request to /api/login
        const response = await fetch(`${apiUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }), // Send credentials
        });

        const data = await response.json(); // Parse JSON response

        if (response.ok) {
            // Login successful
            alert('Login successful!');
            localStorage.setItem('token', data.token); // Save JWT token
            window.location.href = '/dashboard.html'; // Redirect after login
        } else {
            // Login failed (e.g., 401 or 400)
            alert(data.message || 'Login failed. Please try again.');
        }
    } catch (error) {
        // Handle network or other unexpected errors
        console.error('Error:', error);
        alert('An error occurred during login. Please try again later.');
    }
});
