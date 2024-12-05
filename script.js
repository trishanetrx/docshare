const apiUrl = 'https://negombotech.com/clipboard'; // Replace with your server's IP or domain

document.getElementById('saveButton').addEventListener('click', saveToClipboard);
document.getElementById('loadButton').addEventListener('click', loadClipboard);
document.getElementById('clearButton').addEventListener('click', clearClipboard); // Add event listener for clear button

async function saveToClipboard() {
    const text = document.getElementById('clipboardInput').value;
    if (!text) {
        alert('Please enter some text to save.');
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
            alert('Text saved to clipboard!');
            document.getElementById('clipboardInput').value = ''; // Clear input
            loadClipboard(); // Automatically load and display clipboard data after saving
        } else {
            alert('Failed to save text.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while saving text.');
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
                li.textContent = item;
                clipboardList.appendChild(li);
            });
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while loading clipboard data.');
    }
}

async function clearClipboard() {
    try {
        const response = await fetch(apiUrl, {
            method: 'DELETE', // Assuming you have implemented a DELETE route in the backend
        });

        if (response.ok) {
            alert('Clipboard cleared!');
            loadClipboard(); // Refresh the list after clearing
        } else {
            alert('Failed to clear clipboard.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while clearing clipboard.');
    }
}
