document.getElementById('pasteForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const contentInput = document.getElementById('contentInput');
    const content = contentInput.value;

    // Send the pasted content to the backend for storing
    const response = await fetch('/api/paste-content', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
    });

    if (response.ok) {
        contentInput.value = ''; // Clear the textarea
        loadClipboardContent(); // Reload the displayed content
    } else {
        alert('Error saving content');
    }
});

// Load the shared content
async function loadClipboardContent() {
    const response = await fetch('/api/get-content');
    const contentItems = await response.json();

    const sharedContentContainer = document.getElementById('sharedContent');
    sharedContentContainer.innerHTML = ''; // Clear existing content

    contentItems.forEach((item) => {
        const contentHtml = `
            <li class="p-4 border border-gray-300 rounded">
                <p class="text-gray-600">${item.content}</p>
            </li>
        `;
        sharedContentContainer.innerHTML += contentHtml;
    });
}

// Load the shared content when the page loads
window.onload = loadClipboardContent;
