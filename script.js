// script.js
const apiUrl = 'https://api.copythingz.shop'; // Define the API base URL

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
    try {
        const res = await fetch(`${apiUrl}/files`);
        if (!res.ok) throw new Error('Failed to fetch files');
        const files = await res.json();
        const list = document.getElementById('fileList');
        list.innerHTML = '';
        files.forEach(name => {
            const li = document.createElement('li');
            li.textContent = name;
            // download
            const a = document.createElement('a');
            a.href = `${apiUrl}/files/${name}`;
            a.target = '_blank';
            a.textContent = 'Download';
            li.appendChild(a);
            // delete
            const btn = document.createElement('button');
            btn.textContent = 'Delete';
            btn.onclick = () => deleteFile(name);
            li.appendChild(btn);
            list.appendChild(li);
        });
        showMessage('Files loaded successfully', 'success');
    } catch (err) {
        console.error(err);
        showMessage('Error loading files', 'error');
    }
}

// Upload a new file
async function uploadFile() {
    const input = document.getElementById('fileInput');
    if (!input.files.length) {
        showMessage('No file selected', 'error');
        return;
    }
    const formData = new FormData();
    formData.append('file', input.files[0]);
    try {
        const res = await fetch(`${apiUrl}/upload`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (res.ok) {
            showMessage('File uploaded successfully!', 'success');
            await loadClipboard();
        } else {
            showMessage(data.message, 'error');
        }
    } catch (err) {
        console.error('Error uploading file:', err);
        showMessage('An error occurred while uploading.', 'error');
    }
}

// Delete a file
async function deleteFile(filename) {
    try {
        const res = await fetch(`${apiUrl}/files/${filename}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            showMessage('File deleted successfully!', 'success');
            await loadClipboard();
        } else {
            showMessage('Failed to delete the file.', 'error');
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        showMessage('An error occurred while deleting the file.', 'error');
    }
}

// Initialize
document.getElementById('uploadBtn').addEventListener('click', uploadFile);
loadClipboard();
