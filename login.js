const apiUrl = 'https://negombotech.com/api'; // Define the API base URL

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent default form submission

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${apiUrl}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (response.ok) {
            // Store the auth token in localStorage
            localStorage.setItem('token', data.token);
            alert('Login successful! Redirecting to clipboard...');
            window.location.href = '/clipboard.html'; // Redirect to the clipboard page
        } else {
            // Handle login failure
            alert(data.message || 'Login failed. Please try again.');
        }
    } catch (error) {
        // Handle network or server errors
        console.error('Login error:', error);
        alert('An error occurred. Please try again.');
    }
});
