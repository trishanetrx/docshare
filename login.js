// Base URL for the backend API
const apiUrl = 'https://negombotech.com/api'; // Update if the backend URL changes

// Add event listener to handle login form submission
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent default form submission behavior

    // Collect username and password from the login form
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        // Send a POST request to the login endpoint
        const response = await fetch(`${apiUrl}/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' // Ensure correct headers for JSON payload
            },
            body: JSON.stringify({ username, password }) // Send login credentials in JSON format
        });

        // Parse the response from the backend
        const data = await response.json();

        // Handle successful login
        if (response.ok) {
            // Save the JWT token to localStorage for future authenticated requests
            localStorage.setItem('token', data.token);
            
            // Notify the user and redirect to the clipboard page
            alert('Login successful! Redirecting to your clipboard...');
            window.location.href = '/index.html'; // Adjust this path to your actual clipboard page
        } else {
            // Handle errors like invalid credentials
            alert(data.message || 'Login failed. Please check your credentials and try again.');
        }
    } catch (error) {
        // Handle unexpected errors, such as network issues
        console.error('An error occurred during login:', error);
        alert('An error occurred while trying to log in. Please try again later.');
    }
});
