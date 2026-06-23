const apiUrl = '/api'; // relative — works for both local dev and production

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
    setTimeout(() => window.location.href = "/", 2000);
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

// Upload file (with progress bar using XMLHttpRequest)
document.getElementById('uploadButton').addEventListener('click', async () => {
    const fileInput = document.getElementById('fileInput');
    const progressEl = document.getElementById('uploadProgress');
    const uploadBtn = document.getElementById('uploadButton');
    const file = fileInput.files[0];

    if (!file) return showMessage('Please select a file to upload.');
    if (file.size > 2500 * 1024 * 1024) return showMessage('File size exceeds 2500 MB.');

    const formData = new FormData();
    formData.append('file', file);

    // Show & reset progress bar
    progressEl.classList.remove('hidden');
    progressEl.value = 0;
    uploadBtn.disabled = true;

    try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${apiUrl}/upload`, true);

        // Set auth header
        const auth = getAuthHeader();
        if (auth.Authorization) {
            xhr.setRequestHeader('Authorization', auth.Authorization);
        }

        // Progress updates
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 100);
                progressEl.value = pct;
            }
        };

        xhr.onload = async () => {
            uploadBtn.disabled = false;

            if (xhr.status >= 200 && xhr.status < 300) {
                showMessage('File uploaded successfully!', 'success');
                fileInput.value = '';
                progressEl.value = 100;
                await loadFiles();
            } else {
                // Try to read server error message
                try {
                    const err = JSON.parse(xhr.responseText);
                    showMessage(err.message || 'Failed to upload file.');
                } catch {
                    showMessage('Failed to upload file.');
                }
            }

            // Hide bar shortly after completion
            setTimeout(() => {
                progressEl.classList.add('hidden');
                progressEl.value = 0;
            }, 800);
        };

        xhr.onerror = () => {
            uploadBtn.disabled = false;
            showMessage('An error occurred while uploading the file.');
            setTimeout(() => {
                progressEl.classList.add('hidden');
                progressEl.value = 0;
            }, 800);
        };

        xhr.send(formData);
    } catch (err) {
        uploadBtn.disabled = false;
        console.error(err);
        showMessage('An error occurred while uploading the file.');
        setTimeout(() => {
            progressEl.classList.add('hidden');
            progressEl.value = 0;
        }, 800);
    }
});

// Download a file with a per-file progress bar
async function downloadFile(filename, progressBar, progressWrap, dlBtn) {
    dlBtn.disabled = true;
    progressWrap.classList.remove('hidden');
    progressBar.value = 0;

    try {
        const res = await fetch(`${apiUrl}/files/${encodeURIComponent(filename)}`, {
            headers: getAuthHeader()
        });

        if (!res.ok) {
            showMessage('Failed to download the file.');
            return;
        }

        const contentLength = res.headers.get('Content-Length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        const reader = res.body.getReader();
        const chunks = [];
        let received = 0;

        // Stream and accumulate chunks, updating progress as we go
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length;

            if (total > 0) {
                progressBar.value = Math.round((received / total) * 100);
            } else {
                // Unknown size — pulse the bar back and forth
                progressBar.removeAttribute('value');
            }
        }

        // Restore determinate bar to 100% before hiding
        progressBar.value = 100;

        // Combine chunks into a single blob and trigger download
        const blob = new Blob(chunks);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

    } catch (err) {
        console.error(err);
        showMessage('An error occurred while downloading the file.');
    } finally {
        dlBtn.disabled = false;
        setTimeout(() => {
            progressWrap.classList.add('hidden');
            progressBar.value = 0;
        }, 800);
    }
}

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
            return;
        }

        files.forEach(file => {
            const li = document.createElement('li');
            li.classList.add('mb-3');

            // Row: filename link + buttons
            const row = document.createElement('div');
            row.classList.add('flex', 'items-center', 'gap-3');

            const link = document.createElement('span');
            link.textContent = file;
            link.classList.add('flex-1', 'truncate', 'text-sm');

            const dlBtn = document.createElement('button');
            dlBtn.textContent = 'Download';
            dlBtn.style.cssText = 'color:white;background:#3b82f6;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;white-space:nowrap;';

            const delBtn = document.createElement('button');
            delBtn.textContent = 'Delete';
            delBtn.style.cssText = 'color:white;background:#ef4444;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;white-space:nowrap;';
            delBtn.onclick = () => deleteFile(file);

            row.appendChild(link);
            row.appendChild(dlBtn);
            row.appendChild(delBtn);

            // Per-file download progress bar (hidden until download starts)
            const progressWrap = document.createElement('div');
            progressWrap.classList.add('hidden', 'mt-1');

            const progressBar = document.createElement('progress');
            progressBar.value = 0;
            progressBar.max = 100;
            progressBar.classList.add(
                'w-full', 'h-2', 'rounded', 'overflow-hidden', 'appearance-none',
                'bg-gray-200',
                '[&::-webkit-progress-bar]:bg-gray-200',
                '[&::-webkit-progress-value]:bg-blue-500',
                '[&::-moz-progress-bar]:bg-blue-500'
            );

            const progressLabel = document.createElement('p');
            progressLabel.classList.add('text-xs', 'text-gray-500', 'mt-0.5');
            progressLabel.textContent = 'Downloading…';

            progressWrap.appendChild(progressBar);
            progressWrap.appendChild(progressLabel);

            dlBtn.onclick = () => downloadFile(file, progressBar, progressWrap, dlBtn);

            li.appendChild(row);
            li.appendChild(progressWrap);
            fileList.appendChild(li);
        });
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
