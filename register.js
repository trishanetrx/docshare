const apiUrl = 'https://clipboard.negombotech.com/api'; // Use the correct API base URL

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent default form submission behavior

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate that password and confirmation match
    if (password !== confirmPassword) {
        alert('Passwords do not match. Please try again.');
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }), // Send registration data
        });

        const data = await response.json();

        if (response.ok) {
            // Show success message and redirect to the login page
            alert('Registration successful! Redirecting to login...');
            window.location.href = '/login.html'; // Redirect to login page
        } else {
            // Handle registration failure
            alert(data.message || 'Registration failed. Please try again.');
        }
    } catch (error) {
        // Handle network or server errors
        alert('An error occurred while trying to register. Please try again later.');
    }
});
