document.getElementById('registerForm').addEventListener('submit', async function(event) {
    event.preventDefault();  // Prevent form from submitting normally

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    const statusMessage = document.getElementById('statusMessage');
    statusMessage.style.display = 'none';  // Hide the status message initially

    // Basic client-side validation for password match
    if (password !== confirmPassword) {
        statusMessage.textContent = 'Passwords do not match.';
        statusMessage.style.color = 'red';
        statusMessage.style.display = 'block';
        return;
    }

    // Display loading message while waiting for the request
    statusMessage.textContent = 'Registering user...';
    statusMessage.style.color = 'blue';
    statusMessage.style.display = 'block';

    try {
        // Set the correct URL for your backend API
        const apiUrl = 'https://negombotech.com/register';

        // Send the registration data to the backend
        const response = await fetch(apiUrl, { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        // Parse the response from the backend
        const data = await response.json();

        // Handle successful response
        if (response.ok) {
            statusMessage.textContent = 'Registration successful!';
            statusMessage.style.color = 'green';
            statusMessage.style.display = 'block';

            // Redirect to login page after a short delay
            setTimeout(() => {
                window.location.href = 'login.html';  // Redirect to login page
            }, 2000);
        } else {
            // Show error message if the registration fails
            statusMessage.textContent = data.message || 'Registration failed. Please try again.';
            statusMessage.style.color = 'red';
            statusMessage.style.display = 'block';
        }
    } catch (error) {
        // Handle network or server errors
        statusMessage.textContent = 'An error occurred. Please check your internet connection and try again.';
        statusMessage.style.color = 'red';
        statusMessage.style.display = 'block';
    }
});
