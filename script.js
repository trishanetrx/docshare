const apiUrl = 'https://negombotech.com/api'; // Define the API base URL

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

// Initialize the app
loadClipboard();
