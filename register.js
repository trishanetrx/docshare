const apiUrl = 'https://negombotech.com/api'; // Backend API URL

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent default form submission

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate input fields
    if (!username || !password || !confirmPassword) {
        alert('All fields are required. Please fill out the form completely.');
        return;
    }

    if (password !== confirmPassword) {
        alert('Passwords do not match. Please try again.');
        return;
    }

    try {
        // Send the registration request to the backend
        const response = await fetch(`${apiUrl}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (response.ok) {
            // Success: Redirect to login page
            alert('Registration successful! Redirecting to login...');
            window.location.href = '/login.html';
        } else {
            // Handle backend error messages
            alert(data.message || 'Registration failed. Please try again.');
        }
    } catch (error) {
        // Network or unexpected errors
        console.error('Registration error:', error);
        alert('An error occurred while trying to register. Please try again later.');
    }
});
