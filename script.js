const apiUrl = 'https://negombotech.com/api';

// Check if the user is logged in
function checkLoginStatus() {
    const authToken = localStorage.getItem('token');
    if (!authToken) {
        alert('You are not logged in. Redirecting...');
        window.location.href = '/login.html';
    }
}

// Display status messages
function showMessage(message, type) {
    const statusMessage = document.getElementById('statusMessage');
    if (!statusMessage) {
        console.error('Status message element not found.');
        return;
    }

    statusMessage.textContent = message;
    statusMessage.classList.remove('hidden');
    statusMessage.style.color = type === 'success' ? 'green' : 'red';

    setTimeout(() => {
        statusMessage.classList.add('hidden');
    }, 3000);
}

// Load clipboard data
async function loadClipboard() {
    const authToken = localStorage.getItem('token');
    try {
        const response = await fetch(`${apiUrl}/clipboard`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();

        const clipboardList = document.getElementById('clipboardList');
        clipboardList.innerHTML = '';

        if (data.length === 0) {
            clipboardList.innerHTML = '<li class="text-gray-500">No clipboard data available.</li>';
        } else {
            data.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                clipboardList.appendChild(li);
            });
        }
    } catch (error) {
        console.error('Error loading clipboard data:', error);
        showMessage('Error loading clipboard data.', 'error');
    }
}

// Save clipboard data
document.getElementById('saveClipboard').addEventListener('click', async () => {
    const text = document.getElementById('clipboardInput').value;
    if (!text) {
        showMessage('Please enter some text.', 'error');
        return;
    }

    const authToken = localStorage.getItem('token');
    try {
        const response = await fetch(`${apiUrl}/clipboard`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ text })
        });

        if (response.ok) {
            showMessage('Text saved successfully!', 'success');
            document.getElementById('clipboardInput').value = '';
            await loadClipboard();
        } else {
            showMessage('Failed to save text.', 'error');
        }
    } catch (error) {
        console.error('Error saving to clipboard:', error);
        showMessage('Error saving clipboard data.', 'error');
    }
});

// Clear clipboard data
document.getElementById('clearClipboard').addEventListener('click', async () => {
    const authToken = localStorage.getItem('token');
    try {
        const response = await fetch(`${apiUrl}/clipboard`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            showMessage('Clipboard cleared!', 'success');
            await loadClipboard();
        } else {
            showMessage('Failed to clear clipboard.', 'error');
        }
    } catch (error) {
        console.error('Error clearing clipboard data:', error);
        showMessage('Error clearing clipboard.', 'error');
    }
});

// Initialize the app
checkLoginStatus();
loadClipboard();
