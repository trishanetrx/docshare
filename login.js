document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent default form submission behavior

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('https://negombotech.com/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }), // Send login credentials
        });

        const data = await response.json();

        if (response.ok) {
            // Save the authentication token in localStorage
            localStorage.setItem('authToken', data.token);

            // Show success message and redirect to the main page
            alert('Login successful!');
            window.location.href = '/index.html'; // Redirect to the main page
        } else {
            // Handle login failure
            alert(data.message || 'Invalid username or password');
        }
    } catch (error) {
        // Handle network or server errors
        alert('An error occurred while trying to log in. Please try again later.');
    }
});
