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
    // Clear any stored tokens or session data
    localStorage.removeItem('token'); // Assuming the token is stored in localStorage
    sessionStorage.clear();

    // Display logout message
    showMessage('You have been logged out.', 'success');

    // Optionally redirect to a login page or home page after a short delay
    setTimeout(() => {
        window.location.href = "/index.html"; // Adjust the URL as needed
    }, 2000);
});

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

            // Create a new <pre><code> block for the new entry
            const clipboardList = document.getElementById('clipboardList');
            const newBlock = document.createElement('pre');
            const newCode = document.createElement('code');

            newBlock.classList.add('language-nginx');
            newCode.classList.add('language-nginx');
            newCode.textContent = text; // Set the new text

            newBlock.appendChild(newCode);
            clipboardList.appendChild(newBlock); // Add the block to the list

            Prism.highlightElement(newCode); // Apply syntax highlighting
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
            const clipboardList = document.getElementById('clipboardList');
            clipboardList.innerHTML = ''; // Clear all blocks
        } else {
            showMessage('Failed to clear clipboard.', 'error');
        }
    } catch (error) {
        console.error('Error clearing clipboard data:', error);
        showMessage('Error clearing clipboard.', 'error');
    }
});

// Load clipboard data
async function loadClipboard() {
    const authToken = localStorage.getItem('token');
    try {
        const response = await fetch(`${apiUrl}/clipboard`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();

        const clipboardList = document.getElementById('clipboardList');
        clipboardList.innerHTML = ''; // Clear existing blocks

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

                Prism.highlightElement(newCode); // Apply syntax highlighting
            });
        }
    } catch (error) {
        console.error('Error loading clipboard data:', error);
        showMessage('Error loading clipboard data.', 'error');
    }
}

// File upload functionality
document.getElementById('uploadButton').addEventListener('click', async () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        showMessage('Please select a file to upload.', 'error');
        return;
    }

    if (file.size > 700 * 1024 * 1024) { // Check file size (700MB limit)
        showMessage('File size exceeds 700 MB.', 'error');
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
                link.textContent = file;
                link.style.cursor = 'pointer';
                link.style.marginRight = '10px';

                // Add click listener to handle download with authorization
                link.addEventListener('click', async () => {
                    const authToken = localStorage.getItem('token');
                    try {
                        const response = await fetch(`${apiUrl}/files/${file}`, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${authToken}`
                            }
                        });

                        if (!response.ok) {
                            showMessage('Failed to download the file.', 'error');
                            return;
                        }

                        // Create a blob URL for the file
                        const blob = await response.blob();
                        const downloadUrl = URL.createObjectURL(blob);

                        // Create a temporary link to trigger the download
                        const tempLink = document.createElement('a');
                        tempLink.href = downloadUrl;
                        tempLink.download = file; // Set file name for download
                        tempLink.click();

                        // Revoke the object URL after download
                        URL.revokeObjectURL(downloadUrl);
                    } catch (error) {
                        console.error('Error downloading file:', error);
                        showMessage('Error downloading the file.', 'error');
                    }
                });

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

// Initialize the app
loadClipboard();
loadFiles();
