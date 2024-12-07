const apiUrl = 'https://negombotech.com/api'; // Define the API base URL

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

// File upload functionality
document.getElementById('uploadButton').addEventListener('click', async () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        showMessage('Please select a file to upload.', 'error');
        return;
    }

    if (file.size > 50 * 1024 * 1024) { // Check file size (50MB limit)
        showMessage('File size exceeds 50 MB.', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const authToken = localStorage.getItem('token');

    try {
        const response = await fetch(`${apiUrl}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
            body: formData,
        });

        if (response.ok) {
            showMessage('File uploaded successfully!', 'success');
            fileInput.value = ''; // Clear the file input
            await loadFiles(); // Refresh the file list
        } else {
            const errorData = await response.json();
            showMessage(errorData.message || 'Failed to upload file.', 'error');
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        showMessage('An error occurred while uploading the file.', 'error');
    }
});

// Load files dynamically
async function loadFiles() {
    const authToken = localStorage.getItem('token');
    try {
        const response = await fetch(`${apiUrl}/files`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
        });
        const files = await response.json();

        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        if (files.length === 0) {
            fileList.innerHTML = '<li class="text-gray-500">No files uploaded.</li>';
        } else {
            files.forEach((file) => {
                const li = document.createElement('li');

                // File link
                const link = document.createElement('a');
                link.href = `${apiUrl}/files/${file}`;
                link.textContent = file;
                link.target = '_blank';
                link.style.marginRight = '10px';
                li.appendChild(link);

                // Delete button
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.style.color = 'white';
                deleteButton.style.backgroundColor = 'red';
                deleteButton.style.border = 'none';
                deleteButton.style.padding = '3px 8px';
                deleteButton.style.borderRadius = '4px';
                deleteButton.style.cursor = 'pointer';
                deleteButton.addEventListener('click', () => deleteFile(file));

                li.appendChild(deleteButton);
                fileList.appendChild(li);
            });
        }
    } catch (error) {
        console.error('Error loading files:', error);
        showMessage('An error occurred while loading files.', 'error');
    }
}

// Delete a file
async function deleteFile(filename) {
    const authToken = localStorage.getItem('token');
    try {
        const response = await fetch(`${apiUrl}/files/${filename}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` },
        });

        if (response.ok) {
            showMessage('File deleted successfully!', 'success');
            await loadFiles(); // Refresh file list
        } else {
            showMessage('Failed to delete the file.', 'error');
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        showMessage('An error occurred while deleting the file.', 'error');
    }
}

// Logout functionality
document.getElementById('logoutButton').addEventListener('click', () => {
    localStorage.removeItem('token'); // Remove the auth token
    showMessage('Logged out successfully!', 'success');
    setTimeout(() => {
        window.location.href = '/login.html'; // Redirect to the login page
    }, 1000);
});

// Initialize the app
checkLoginStatus();
loadClipboard();
loadFiles();
