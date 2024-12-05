const apiUrl = 'https://negombotech.com/clipboard'; // Replace with your server's IP or domain

document.getElementById('saveButton').addEventListener('click', saveToClipboard);
document.getElementById('loadButton').addEventListener('click', loadClipboard);
document.getElementById('clearButton').addEventListener('click', clearClipboard);

async function saveToClipboard() {
    const text = document.getElementById('clipboardInput').value;
    const fileInput = document.getElementById('fileInput');
    const statusMessage = document.getElementById('statusMessage'); // For feedback

    const formData = new FormData(); // Using FormData to send both text and file

    if (text) {
        formData.append('text', text); // Append text to the FormData
    }

    if (fileInput.files.length > 0) {
        formData.append('file', fileInput.files[0]); // Append the selected file to the FormData
    }

    if (!text && fileInput.files.length === 0) {
        showMessage('Please enter text or select a file to save.', 'error');
        return;
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            body: formData, // Send the FormData as the body
        });

        if (response.ok) {
            showMessage('Text and/or file saved to clipboard!', 'success');
            document.getElementById('clipboardInput').value = ''; // Clear input
            fileInput.value = ''; // Clear file input
            loadClipboard(); // Automatically refresh clipboard data
        } else {
            showMessage('Failed to save text or file.', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('An error occurred while saving text or file.', 'error');
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
                if (item.text) {
                    li.textContent = item.text;
                } else if (item.file) {
                    li.innerHTML = `<a href="/uploads/${item.file}" target="_blank">Download File</a>`; // Link to the uploaded file
                }
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
