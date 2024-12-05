const apiUrl = 'https://negombotech.com'; // Base API URL, updated to correct endpoint

// Clipboard functionality
document.getElementById('saveButton').addEventListener('click', saveToClipboard);
document.getElementById('loadButton').addEventListener('click', loadClipboard);
document.getElementById('clearButton').addEventListener('click', clearClipboard);
loadClipboard();

async function saveToClipboard() {
    const text = document.getElementById('clipboardInput').value;

    if (!text) {
        showMessage('Please enter some text to save.', 'error');
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/clipboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
    try {
        const response = await fetch(`${apiUrl}/clipboard`);
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
    try {
        const response = await fetch(`${apiUrl}/clipboard`, { method: 'DELETE' });

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
loadFiles();

async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        showMessage('Please select a file to upload.', 'error');
        return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10 MB file size limit
        showMessage('File size exceeds 10 MB.', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${apiUrl}/upload`, {
            method: 'POST',
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
    try {
        const response = await fetch(`${apiUrl}/files`);
        const files = await response.json();

        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        if (files.length === 0) {
            fileList.innerHTML = '<li class="text-gray-500">No files uploaded.</li>';
        } else {
            files.forEach((file) => {
                const li = document.createElement('li');
                const link = document.createElement('a');
                link.href = `${apiUrl}/files/${file}`;
                link.textContent = file;
                link.target = '_blank';
                li.appendChild(link);
                fileList.appendChild(li);
            });
        }
    } catch (error) {
        showMessage('An error occurred while loading files.', 'error');
    }
}

function showMessage(message, type) {
    const statusMessage = document.getElementById('statusMessage');
    statusMessage.textContent = message;
    statusMessage.style.display = 'block';
    statusMessage.style.color = type === 'success' ? 'green' : 'red';

    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 3000);
}
