async function loadClipboardContent() {
    const response = await fetch("clipboard-content.json");
    const clipboardItems = await response.json();
    
    const container = document.querySelector("#sharedContent");
    container.innerHTML = ""; // Clear existing content

    clipboardItems.forEach((item) => {
        const contentHtml = `
            <li class="p-4 border border-gray-300 rounded">
                <h3 class="text-lg font-semibold">${item.title}</h3>
                <p class="text-gray-600">${item.content}</p>
            </li>
        `;
        container.innerHTML += contentHtml;
    });
}

window.onload = loadClipboardContent;
