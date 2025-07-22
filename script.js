const apiUrl = 'https://copythingz.shop/api'; // Define the API base URL

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

// Logout functionality
document.getElementById("logoutButton").addEventListener("click", () => {
    localStorage.removeItem('token');
    sessionStorage.clear();
    showMessage('You have been logged out.', 'success');
    setTimeout(() => {
        window.location.href = "/index.html";
    }, 2000);
});

// Save clipboard data (unchanged)
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
            const clipboardList = document.getElementById('clipboardList');
            const newBlock = document.createElement('pre');
            const newCode = document.createElement('code');
            newBlock.classList.add('language-nginx');
            newCode.classList.add('language-nginx');
            newCode.textContent = text;
            newBlock.appendChild(newCode);
            clipboardList.appendChild(newBlock);
            Prism.highlightElement(newCode);
        } else {
            showMessage('Failed to save text.', 'error');
        }
    } catch (error) {
        console.error('Error saving to clipboard:', error);
        showMessage('Error saving clipboard data.', 'error');
    }
});

// Clear clipboard data (unchanged)
document.getElementById('clearClipboard').addEventListener('click', async () => {
    const authToken = localStorage.getItem('token');
    try {
        const response = await fetch(`${apiUrl}/clipboard`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            showMessage('Clipboard cleared!', 'success');
            const clipboardList = document.getElementById('clipboardList');
            clipboardList.innerHTML = '';
        } else {
            showMessage('Failed to clear clipboard.', 'error');
        }
    } catch (error) {
        console.error('Error clearing clipboard data:', error);
        showMessage('Error clearing clipboard.', 'error');
    }
});

// Load clipboard data (unchanged)
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
            const noDataMessage = document.createElement('li');
            noDataMessage.textContent = 'No clipboard data available.';
            noDataMessage.classList.add('text-gray-500');
            clipboardList.appendChild(noDataMessage);
        } else {
            data.forEach((item) => {
                const newBlock = document.createElement('pre');
                const newCode = document.createElement('code');
                newBlock.classList.add('language-nginx');
                newCode.classList.add('language-nginx');
                newCode.textContent = item;
                newBlock.appendChild(newCode);
                clipboardList.appendChild(newBlock);
                Prism.highlightElement(newCode);
            });
        }
    } catch (error) {
        console.error('Error loading clipboard data:', error);
        showMessage('Error loading clipboard data.', 'error');
    }
}

// 🚀 File upload with progress bar
document.getElementById('uploadButton').addEventListener('click', () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    const progressBar = document.getElementById('uploadProgress');

    if (!file) {
        showMessage('Please select a file to upload.', 'error');
        return;
    }

    if (file.size > 700 * 1024 * 1024) {
        showMessage('File size exceeds 700 MB.', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const authToken = localStorage.getItem('token');
    const xhr = new XMLHttpRequest();

    xhr.open('POST', `${apiUrl}/upload`, true);
    xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);

    progressBar.classList.remove('hidden');
    progressBar.value = 0;

    xhr.upload.onprogress = function (event) {
        if (event.lengthComputable) {
            const percent = (event.loaded / event.total) * 100;
            progressBar.value = percent;
        }
    };

    xhr.onload = async function () {
        if (xhr.status === 200) {
            showMessage('File uploaded successfully!', 'success');
            fileInput.value = '';
            progressBar.classList.add('hidden');
            progressBar.value = 0;
            await loadFiles();
        } else {
            const error = JSON.parse(xhr.responseText);
            showMessage(error.message || 'Failed to upload file.', 'error');
            progressBar.classList.add('hidden');
        }
    };

    xhr.onerror = function () {
        showMessage('An error occurred while uploading the file.', 'error');
        progressBar.classList.add('hidden');
    };

    xhr.send(formData);
});

// Load files (unchanged)
async function loadFiles() {
    const authToken = localStorage.getItem('token');
    try {
        const response = await fetch(`${apiUrl}/files`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const files = await response.json();
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        if (files.length === 0) {
            fileList.innerHTML = '<li class="text-gray-500">No files uploaded.</li>';
        } else {
            files.forEach((file) => {
                const li = document.createElement('li');
                const link = document.createElement('a');
                link.textContent = file;
                link.style.cursor = 'pointer';
                link.style.marginRight = '10px';

                link.addEventListener('click', async () => {
                    const authToken = localStorage.getItem('token');
                    try {
                        const response = await fetch(`${apiUrl}/files/${file}`, {
                            method: 'GET',
                            headers: { 'Authorization': `Bearer ${authToken}` }
                        });

                        if (!response.ok) {
                            showMessage('Failed to download the file.', 'error');
                            return;
                        }

                        const blob = await response.blob();
                        const downloadUrl = URL.createObjectURL(blob);
                        const tempLink = document.createElement('a');
                        tempLink.href = downloadUrl;
                        tempLink.download = file;
                        tempLink.click();
                        URL.revokeObjectURL(downloadUrl);
                    } catch (error) {
                        console.error('Error downloading file:', error);
                        showMessage('Error downloading the file.', 'error');
                    }
                });

                li.appendChild(link);

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
        console.error('Error loading files:', error);
        showMessage('An error occurred while loading files.', 'error');
    }
}

// Delete a file (unchanged)
async function deleteFile(filename) {
    const authToken = localStorage.getItem('token');
    try {
        const response = await fetch(`${apiUrl}/files/${filename}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            showMessage('File deleted successfully!', 'success');
            await loadFiles();
        } else {
            showMessage('Failed to delete the file.', 'error');
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        showMessage('An error occurred while deleting the file.', 'error');
    }
}

// Init
loadClipboard();
loadFiles();
