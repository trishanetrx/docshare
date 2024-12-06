document.getElementById('registerForm').addEventListener('submit', async function(event) {
    event.preventDefault();  // Prevent form from submitting normally

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    const statusMessage = document.getElementById('statusMessage');
    statusMessage.style.display = 'none';  // Hide the status message initially

    // Validate if the passwords match
    if (password !== confirmPassword) {
        statusMessage.textContent = 'Passwords do not match.';
        statusMessage.style.color = 'red';
        statusMessage.style.display = 'block';
        return;
    }

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

        const data = await response.json();

        if (response.ok) {
            // Show success message and redirect
            statusMessage.textContent = 'Registration successful!';
            statusMessage.style.color = 'green';
            statusMessage.style.display = 'block';

            // Redirect to login page after success
            setTimeout(() => {
                window.location.href = 'login.html'; // Redirect to login page
            }, 2000);
        } else {
            // Show error message
            statusMessage.textContent = data.message || 'Registration failed.';
            statusMessage.style.color = 'red';
            statusMessage.style.display = 'block';
        }
    } catch (error) {
        // Handle network or server errors
        statusMessage.textContent = 'An error occurred. Please try again.';
        statusMessage.style.color = 'red';
        statusMessage.style.display = 'block';
    }
});
