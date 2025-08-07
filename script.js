const apiUrl = 'https://copythingz.shop/api'; // ✅ Secure backend base URL

// Helper: Get Authorization Header or throw if missing
function getAuthHeader() {
    const token = localStorage.getItem('token');
    if (!token || !token.startsWith('ey')) {
        showMessage('Missing or invalid token. Please log in again.');
        throw new Error('No valid token');
    }
    return { Authorization: `Bearer ${token}` };
}

// Display status messages
function showMessage(message, type = 'error') {
    const statusMessage = document.getElementById('statusMessage');
    if (!statusMessage) return console.error('Status message element not found.');

    statusMessage.textContent = message;
    statusMessage.classList.remove('hidden');
    statusMessage.style.color = type === 'success' ? 'green' : 'red';

    setTimeout(() => statusMessage.classList.add('hidden'), 3000);
}

// Logout
document.getElementById("logoutButton").addEventListener("click", () => {
    localStorage.removeItem('token');
    sessionStorage.clear();
    showMessage('You have been logged out.', 'success');
    setTimeout(() => window.location.href = "/index.html", 2000);
});

// Save clipboard
document.getElementById('saveClipboard').addEventListener('click', async () => {
    const text = document.getElementById('clipboardInput').value;
    if (!text) return showMessage('Please enter some text.');

    try {
        const res = await fetch(`${apiUrl}/clipboard`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({ text })
        });

        if (res.ok) {
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
            const err = await res.json();
            showMessage(err.message || 'Failed to save text.');
        }
    } catch (err) {
        console.error(err);
        showMessage('Error saving clipboard data.');
    }
});

// Clear clipboard
document.getElementById('clearClipboard').addEventListener('click', async () => {
    try {
        const res = await fetch(`${apiUrl}/clipboard`, {
            method: 'DELETE',
            headers: getAuthHeader()
        });

        if (res.ok) {
            showMessage('Clipboard cleared!', 'success');
            document.getElementById('clipboardList').innerHTML = '';
        } else {
            showMessage('Failed to clear clipboard.');
        }
    } catch (err) {
        console.error(err);
        showMessage('Error clearing clipboard.');
    }
});

// Load clipboard
async function loadClipboard() {
    try {
        const res = await fetch(`${apiUrl}/clipboard`, {
            headers: getAuthHeader()
        });

        const data = await res.json();
        const clipboardList = document.getElementById('clipboardList');
        clipboardList.innerHTML = '';

        if (data.length === 0) {
            const noData = document.createElement('li');
            noData.textContent = 'No clipboard data available.';
            noData.classList.add('text-gray-500');
            clipboardList.appendChild(noData);
        } else {
            data.forEach(item => {
                const pre = document.createElement('pre');
                const code = document.createElement('code');
                pre.classList.add('language-nginx');
                code.classList.add('language-nginx');
                code.textContent = item;
                pre.appendChild(code);
                clipboardList.appendChild(pre);
                Prism.highlightElement(code);
            });
        }
    } catch (err) {
        console.error(err);
        showMessage('Error loading clipboard data.');
    }
}

// Upload file
document.getElementById('uploadButton').addEventListener('click', async () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    if (!file) return showMessage('Please select a file to upload.');
    if (file.size > 700 * 1024 * 1024) return showMessage('File size exceeds 700 MB.');

    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch(`${apiUrl}/upload`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: formData
        });

        if (res.ok) {
            showMessage('File uploaded successfully!', 'success');
            fileInput.value = '';
            await loadFiles();
        } else {
            const errorData = await res.json();
            showMessage(errorData.message || 'Failed to upload file.');
        }
    } catch (err) {
        console.error(err);
        showMessage('An error occurred while uploading the file.');
    }
});

// Load files
async function loadFiles() {
    try {
        const res = await fetch(`${apiUrl}/files`, {
            headers: getAuthHeader()
        });

        const files = await res.json();
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        if (files.length === 0) {
            fileList.innerHTML = '<li class="text-gray-500">No files uploaded.</li>';
        } else {
            files.forEach(file => {
                const li = document.createElement('li');

                const link = document.createElement('a');
                link.textContent = file;
                link.href = '#';
                link.style.marginRight = '10px';
                link.onclick = async (e) => {
                    e.preventDefault();
                    const res = await fetch(`${apiUrl}/files/${file}`, {
                        headers: getAuthHeader()
                    });
                    if (!res.ok) return showMessage('Failed to download the file.');
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = file;
                    a.click();
                    URL.revokeObjectURL(url);
                };

                const delBtn = document.createElement('button');
                delBtn.textContent = 'Delete';
                delBtn.style.cssText = 'color:white;background:red;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;';
                delBtn.onclick = () => deleteFile(file);

                li.appendChild(link);
                li.appendChild(delBtn);
                fileList.appendChild(li);
            });
        }
    } catch (err) {
        console.error(err);
        showMessage('An error occurred while loading files.');
    }
}

// Delete file
async function deleteFile(filename) {
    try {
        const res = await fetch(`${apiUrl}/files/${filename}`, {
            method: 'DELETE',
            headers: getAuthHeader()
        });

        if (res.ok) {
            showMessage('File deleted successfully!', 'success');
            await loadFiles();
        } else {
            showMessage('Failed to delete the file.');
        }
    } catch (err) {
        console.error(err);
        showMessage('An error occurred while deleting the file.');
    }
}

// 🔁 Initialize
loadClipboard();
loadFiles();
