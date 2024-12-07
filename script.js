const apiUrl = 'https://negombotech.com/api';

// Check if the user is logged in and set UI accordingly
function checkLoginStatus() {
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
        // User is logged in
        document.getElementById('loginButton').style.display = 'none';
        document.getElementById('logoutButton').style.display = 'block';
        document.getElementById('clipboardSection').classList.remove('hidden');
        document.getElementById('fileSection').classList.remove('hidden');
        loadClipboard();
        loadFiles();
    } else {
        // User is not logged in
        document.getElementById('loginButton').style.display = 'block';
        document.getElementById('logoutButton').style.display = 'none';
        document.getElementById('clipboardSection').classList.add('hidden');
        document.getElementById('fileSection').classList.add('hidden');
    }
}

// Clipboard functionality
document.getElementById('saveButton').addEventListener('click', saveToClipboard);
document.getElementById('loadButton').addEventListener('click', loadClipboard);
document.getElementById('clearButton').addEventListener('click', clearClipboard);

async function saveToClipboard() {
    const text = document.getElementById('clipboardInput').value;

    if (!text) {
        showMessage('Please enter some text to save.', 'error');
        return;
    }

    const authToken = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${apiUrl}/clipboard`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authToken
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
    const authToken = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${apiUrl}/clipboard`, {
            headers: { 'Authorization': authToken }
        });
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
    const authToken = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${apiUrl}/clipboard`, {
            method: 'DELETE',
            headers: { 'Authorization': authToken }
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
document.getElementById('uploadButton').addEventListener('click', uploadFile);

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

    const authToken = localStorage.getItem('authToken');

    try {
        const response = await fetch(`${apiUrl}/upload`, {
            method: 'POST',
            headers: { 'Authorization': authToken },
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
    const authToken = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${apiUrl}/files`, {
            headers: { 'Authorization': authToken }
        });
        const files = await response.json();

        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        if (files.length === 0) {
            fileList.innerHTML = '<li class="text-gray-500">No files uploaded.</li>';
        } else {
            files.forEach((file) => {
                const li = document.createElement('li');

                // File link with token in the URL
                const link = document.createElement('a');
                link.href = `${apiUrl}/files/${file}?token=${authToken}`; // Add token as a query parameter
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
                deleteButton.style.padding = '5px 10px';
                deleteButton.style.borderRadius = '5px';
                deleteButton.style.cursor = 'pointer';
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
    const authToken = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${apiUrl}/files/${filename}`, {
            method: 'DELETE',
            headers: { 'Authorization': authToken }
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

// Login and logout functionality
document.getElementById('loginButton').addEventListener('click', () => {
    window.location.href = '/login.html'; // Redirect to login page
});

document.getElementById('logoutButton').addEventListener('click', () => {
    localStorage.removeItem('authToken');
    checkLoginStatus(); // Update UI after logout
});

// Check login status when the page loads
checkLoginStatus();
