document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');

    if (!token) {
        alert('You must be logged in');
        window.location.href = 'login.html';
        return;
    }

    // Load clipboard data
    fetch('https://copythingz.shop/api/clipboard', {
        headers: { Authorization: `Bearer ${token}` }
    })
        .then(res => res.json())
        .then(data => {
            const list = document.getElementById('clipboard-list');
            if (Array.isArray(data)) {
                data.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = item;
                    list.appendChild(li);
                });
            }
        })
        .catch(err => {
            console.error('Failed to load clipboard data:', err);
            alert('Failed to load clipboard');
        });

    // Load file list
    fetch('https://copythingz.shop/api/files', {
        headers: { Authorization: `Bearer ${token}` }
    })
        .then(res => res.json())
        .then(files => {
            const fileList = document.getElementById('file-list');
            files.forEach(file => {
                const li = document.createElement('li');
                li.innerHTML = `<a href="/uploads/${file}" target="_blank">${file}</a>`;
                fileList.appendChild(li);
            });
        })
        .catch(err => {
            console.error('Failed to load files:', err);
            alert('Failed to load file list');
        });
});
