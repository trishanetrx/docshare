const apiUrl = 'https://negombotech.com/clipboard'; // Replace with your server's IP or domain

document.getElementById('saveButton').addEventListener('click', saveToClipboard);
document.getElementById('loadButton').addEventListener('click', loadClipboard);

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

        data.forEach((item) => {
            const li = document.createElement('li');
            li.textContent = item;
            clipboardList.appendChild(li);
        });
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while loading clipboard data.');
    }
}
