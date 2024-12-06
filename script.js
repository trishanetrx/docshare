const apiUrl = 'https://negombotech.com/api'; // Backend API URL

// Clipboard functionality
document.getElementById('saveClipboard').addEventListener('click', saveToClipboard);
document.getElementById('clearClipboard').addEventListener('click', clearClipboard);
window.addEventListener('load', initializeApp); // Load clipboard and files when page loads

async function initializeApp() {
    const authToken = localStorage.getItem('token');
    if (!authToken) {
        showMessage('You are not logged in. Please log in first.', 'error');
        window.location.href = '/login.html'; // Redirect to login page if not authenticated
        return;
    }
    loadClipboard();
    loadFiles();
}

async function saveToClipboard() {
    const text = document.getElementById('clipboardInput').value;
    if (!text) {
        showMessage('Please enter some text to save.', 'error');
        return;
    }

    const authToken = localStorage.getItem('token');
    try {
        const response = await fetch(`${apiUrl}/clipboard`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ text }),
        });

        if (response.ok) {
            showMessage('Text saved to clipboard!', 'success');
            document.getElementById('clipboardInput').value = '';
            loadClipboard();
        } else {
            showMessage('Failed to save text.', 'error');
        }
    } catch (error) {
        showMessage('An error occurred while saving text.', 'error');
    }
}

async function loadClipboard() {
    const authToken = localStorage.getItem('token');
    try {
        const response = await fetch(`${apiUrl}/clipboard`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
        });

        if (response.status === 401) {
            showMessage('Unauthorized. Please log in again.', 'error');
            window.location.href = '/login.html';
            return;
        }

        const data = await response.json();
        const clipboardList = document.getElementById('clipboardList');
        clipboardList.innerHTML = '';

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
        showMessage('An error occurred while loading clipboard data.', 'error');
    }
}

async function clearClipboard() {
    const authToken = localStorage.getItem('token');
    try {
        const response = await fetch(`${apiUrl}/clipboard`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` },
        });

        if (response.ok) {
            showMessage('Clipboard cleared!', 'success');
            loadClipboard();
        } else {
            showMessage('Failed to clear clipboard.', 'error');
        }
    } catch (error) {
        showMessage('An error occurred while clearing clipboard.', 'error');
    }
}

// File upload functionality
document.getElementById('uploadFile').addEventListener('click', uploadFile);

async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        showMessage('Please select a file to upload.', 'error');
        return;
    }

    if (file.size > 50 * 1024 * 1024) {
        showMessage('File size exceeds 50 MB.', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const authToken = localStorage.getItem('token');
    try {
        const response = await fetch(`${apiUrl}/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData,
        });

        if (response.ok) {
            showMessage('File uploaded successfully!', 'success');
            fileInput.value = '';
            loadFiles();
        } else {
            showMessage('Failed to upload file.', 'error');
        }
    } catch (error) {
        showMessage('An error occurred while uploading the file.', 'error');
    }
}

async function loadFiles() {
    const authToken = localStorage.getItem('token');
    try {
        const response = await fetch(`${apiUrl}/files`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
        });

        if (response.status === 401) {
            showMessage('Unauthorized. Please log in again.', 'error');
            window.location.href = '/login.html';
            return;
        }

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
                link.className = 'text-blue-600 hover:underline';
                li.appendChild(link);

                // Delete button
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.className = 'ml-4 bg-red-500 text-white px-2 py-1 rounded hover:bg-red-700';
                deleteButton.addEventListener('click', () => deleteFile(file));

                li.appendChild(deleteButton);
                fileList.appendChild(li);
            });
        }
    } catch (error) {
        showMessage('An error occurred while loading files.', 'error');
    }
}

async function deleteFile(filename) {
    const authToken = localStorage.getItem('token');
    try {
        const response = await fetch(`${apiUrl}/files/${filename}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` },
        });

        if (response.ok) {
            showMessage('File deleted successfully!', 'success');
            loadFiles();
        } else {
            showMessage('Failed to delete the file.', 'error');
        }
    } catch (error) {
        showMessage('An error occurred while deleting the file.', 'error');
    }
}

// Show status message
function showMessage(message, type) {
    const statusMessage = document.getElementById('statusMessage');
    statusMessage.textContent = message;
    statusMessage.style.display = 'block';
    statusMessage.style.color = type === 'success' ? 'green' : 'red';

    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 3000);
}
