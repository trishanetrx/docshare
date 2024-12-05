document.addEventListener('DOMContentLoaded', function () {
    const apiUrl = 'https://negombotech.com/clipboard'; // Clipboard API
    const filesUrl = 'https://negombotech.com/uploads';   // Correct URL for accessing uploaded files

    const uploadUrl = 'https://negombotech.com/upload';  // Correct URL for the upload route

    // Event Listeners
    document.getElementById('saveButton').addEventListener('click', saveToClipboard);
    document.getElementById('loadButton').addEventListener('click', loadClipboard);
    document.getElementById('clearButton').addEventListener('click', clearClipboard);
    document.getElementById('uploadButton').addEventListener('click', uploadFile);
    loadFileList(); // Load file list on page load

    // Save clipboard text
    async function saveToClipboard() {
        const text = document.getElementById('clipboardInput').value;
        const statusMessage = document.getElementById('statusMessage');

        if (!text) {
            showMessage('Please enter some text to save.', 'error');
            return;
        }

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text }),
            });

            if (response.ok) {
                showMessage('Text saved to clipboard!', 'success');
                document.getElementById('clipboardInput').value = ''; // Clear input
                loadClipboard(); // Automatically refresh clipboard data
            } else {
                showMessage('Failed to save text.', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('An error occurred while saving text.', 'error');
        }
    }

    // Load clipboard data
    async function loadClipboard() {
        const clipboardList = document.getElementById('clipboardList');
        if (!clipboardList) return;

        try {
            const response = await fetch(apiUrl);
            const data = await response.json();

            clipboardList.innerHTML = ''; // Clear previous list

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
            console.error('Error:', error);
            showMessage('An error occurred while loading clipboard data.', 'error');
        }
    }

    // Clear clipboard data
    async function clearClipboard() {
        try {
            const response = await fetch(apiUrl, {
                method: 'DELETE',
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

    // Upload a file
    async function uploadFile() {
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];
        const statusMessage = document.getElementById('statusMessage');

        if (!file) {
            showMessage('Please choose a file to upload.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(uploadUrl, {  // Correct URL here for file upload
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                showMessage('File uploaded successfully!', 'success');
                fileInput.value = ''; // Clear file input
                loadFileList(); // Refresh file list
            } else {
                showMessage('Failed to upload file.', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('An error occurred while uploading file.', 'error');
        }
    }

    // Load the list of uploaded files
    async function loadFileList() {
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = ''; // Clear previous list

        try {
            const response = await fetch(filesUrl);  // Correct URL here for files list
            const files = await response.json();

            if (files.length === 0) {
                fileList.innerHTML = '<li class="text-gray-500">No files available.</li>';
            } else {
                files.forEach((file) => {
                    const li = document.createElement('li');
                    li.className = "mb-2";

                    const downloadLink = document.createElement('a');
                    downloadLink.href = `${filesUrl}/${file}`;
                    downloadLink.textContent = file;
                    downloadLink.className = "text-blue-
