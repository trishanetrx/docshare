const apiUrl = 'https://negombotech.com/clipboard'; // Replace with your server's IP or domain

document.getElementById('saveButton').addEventListener('click', saveToClipboard);
document.getElementById('loadButton').addEventListener('click', loadClipboard);
document.getElementById('clearButton').addEventListener('click', clearClipboard);

async function saveToClipboard() {
    const text = document.getElementById('clipboardInput').value;
    const statusMessage = document.getElementById('statusMessage'); // For feedback

    if (!text) {
        showMessage('Please enter some text to save.', 'error');
        return;
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });

        if (response.ok) {
            showMessage('Text saved to clipboard!', 'success');
            document.getElementById('clipboardInput').value = ''; // Clear input
            loadClipboard(); // Automatically refresh clipboard data
        } else {
            showMessage('Failed to save text.', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('An error occurred while saving text.', 'error');
    }
}

async function loadClipboard() {
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        const clipboardList = document.getElementById('clipboardList');
        clipboardList.innerHTML = ''; // Clear previous list

        if (data.length === 0) {
            clipboardList.innerHTML = '<li class="text-gray-500">No clipboard data available.</li>';
        } else {
            data.forEach((item) => {
                const li = document.createElement('li');
                li.textContent = item;
                clipboardList.appendChild(li);
            });
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('An error occurred while loading clipboard data.', 'error');
    }
}

async function clearClipboard() {
    try {
        const response = await fetch(apiUrl, {
            method: 'DELETE', // Assuming you have implemented a DELETE route in the backend
        });

        if (response.ok) {
            showMessage('Clipboard cleared!', 'success');
            loadClipboard(); // Refresh the list after clearing
        } else {
            showMessage('Failed to clear clipboard.', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('An error occurred while clearing clipboard.', 'error');
    }
}

// Utility function for showing status messages
function showMessage(message, type) {
    const statusMessage = document.getElementById('statusMessage');
    statusMessage.textContent = message;
    statusMessage.style.display = 'block';
    statusMessage.style.color = type === 'success' ? 'green' : 'red';

    setTimeout(() => {
        statusMessage.style.display = 'none'; // Hide after 3 seconds
    }, 3000);
}
