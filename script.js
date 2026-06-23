const apiUrl = '/api'; // relative — works for both local dev and production

// ── Auth guard ────────────────────────────────────────────────────────────────
function getToken() {
    const token = localStorage.getItem('token');
    if (!token || !token.startsWith('ey')) {
        window.location.replace('/login.html');
        throw new Error('No valid token');
    }
    return token;
}

function getAuthHeader() {
    return { Authorization: `Bearer ${getToken()}` };
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(message, type = 'error') {
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-circle-check'
                : type === 'info'    ? 'fa-circle-info'
                :                     'fa-circle-exclamation';
    el.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}

// ── User info ─────────────────────────────────────────────────────────────────
function initUser() {
    const username = localStorage.getItem('username') || 'User';
    document.getElementById('userName').textContent   = username;
    document.getElementById('userAvatar').textContent = username.charAt(0).toUpperCase();
}

// ── Sidebar / nav ─────────────────────────────────────────────────────────────
function initNav() {
    const navItems  = document.querySelectorAll('.nav-item[data-panel]');
    const panels    = document.querySelectorAll('.panel');
    const topbarTitle = document.getElementById('topbarTitle');

    navItems.forEach(btn => {
        btn.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.panel).classList.add('active');
            topbarTitle.textContent = btn.textContent.trim();
            closeSidebar();
        });
    });

    // Mobile sidebar
    const sidebar  = document.getElementById('sidebar');
    const overlay  = document.getElementById('sidebarOverlay');
    const toggle   = document.getElementById('menuToggle');

    toggle.addEventListener('click', () => {
        sidebar.classList.add('open');
        overlay.classList.add('open');
    });
    overlay.addEventListener('click', closeSidebar);

    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
    }
}

// ── Logout ────────────────────────────────────────────────────────────────────
document.getElementById('logoutButton').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/';
});

// ── Clipboard ─────────────────────────────────────────────────────────────────
function buildClipItem(text, index) {
    const wrap = document.createElement('div');
    wrap.className = 'clip-item';
    wrap.dataset.index = index;

    const header = document.createElement('div');
    header.className = 'clip-item-header';

    const label = document.createElement('span');
    label.style.cssText = 'font-size:.72rem;color:var(--text-muted);';
    label.textContent = `Item ${index + 1}`;

    const actions = document.createElement('div');
    actions.className = 'clip-item-actions';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn-icon';
    copyBtn.title = 'Copy to clipboard';
    copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(text).then(() => toast('Copied!', 'success'));
    });

    actions.appendChild(copyBtn);
    header.appendChild(label);
    header.appendChild(actions);

    const pre  = document.createElement('pre');
    const code = document.createElement('code');
    pre.classList.add('language-nginx');
    code.classList.add('language-nginx');
    code.textContent = text;
    pre.appendChild(code);

    wrap.appendChild(header);
    wrap.appendChild(pre);

    if (typeof Prism !== 'undefined') Prism.highlightElement(code);
    return wrap;
}

function renderClipboard(items) {
    const list  = document.getElementById('clipboardList');
    const empty = document.getElementById('clipboardEmpty');
    // Remove old items but keep the empty state element
    [...list.children].forEach(c => { if (c !== empty) c.remove(); });

    if (!items || items.length === 0) {
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    items.forEach((text, i) => list.appendChild(buildClipItem(text, i)));
}

async function loadClipboard() {
    try {
        const res  = await fetch(`${apiUrl}/clipboard`, { headers: getAuthHeader() });
        const data = await res.json();
        renderClipboard(data);
    } catch (err) {
        if (err.message !== 'No valid token') toast('Failed to load clipboard.');
    }
}

document.getElementById('saveClipboard').addEventListener('click', async () => {
    const input = document.getElementById('clipboardInput');
    const text  = input.value.trim();
    if (!text) return toast('Please enter some text first.');

    try {
        const res = await fetch(`${apiUrl}/clipboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify({ text }),
        });
        if (res.ok) {
            const data = await res.json();
            input.value = '';
            renderClipboard(data.data);
            toast('Saved!', 'success');
        } else {
            const err = await res.json();
            toast(err.message || 'Failed to save.');
        }
    } catch { toast('Failed to save.'); }
});

document.getElementById('clearClipboard').addEventListener('click', async () => {
    if (!confirm('Clear all clipboard items?')) return;
    try {
        const res = await fetch(`${apiUrl}/clipboard`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });
        if (res.ok) {
            renderClipboard([]);
            toast('Clipboard cleared.', 'info');
        } else {
            toast('Failed to clear clipboard.');
        }
    } catch { toast('Failed to clear clipboard.'); }
});

// ── Files ─────────────────────────────────────────────────────────────────────
function formatBytes(bytes) {
    if (bytes < 1024)       return bytes + ' B';
    if (bytes < 1048576)    return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(2) + ' GB';
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const map = {
        pdf: 'fa-file-pdf', doc: 'fa-file-word', docx: 'fa-file-word',
        xls: 'fa-file-excel', xlsx: 'fa-file-excel',
        ppt: 'fa-file-powerpoint', pptx: 'fa-file-powerpoint',
        zip: 'fa-file-zipper', rar: 'fa-file-zipper', gz: 'fa-file-zipper',
        jpg: 'fa-file-image', jpeg: 'fa-file-image', png: 'fa-file-image',
        gif: 'fa-file-image', svg: 'fa-file-image', webp: 'fa-file-image',
        mp4: 'fa-file-video', mov: 'fa-file-video', avi: 'fa-file-video',
        mp3: 'fa-file-audio', wav: 'fa-file-audio',
        js: 'fa-file-code', ts: 'fa-file-code', py: 'fa-file-code',
        html: 'fa-file-code', css: 'fa-file-code', json: 'fa-file-code',
        txt: 'fa-file-lines', md: 'fa-file-lines',
    };
    return map[ext] || 'fa-file';
}

async function downloadFile(filename, progressBar, progressWrap, progressLabel, dlBtn) {
    dlBtn.disabled = true;
    progressWrap.classList.add('visible');
    progressBar.value = 0;
    progressLabel.textContent = 'Starting download…';

    try {
        const res = await fetch(`${apiUrl}/files/${encodeURIComponent(filename)}`, {
            headers: getAuthHeader(),
        });

        if (!res.ok) { toast('Failed to download file.'); return; }

        const contentLength = res.headers.get('Content-Length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        const reader = res.body.getReader();
        const chunks = [];
        let received = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length;

            if (total > 0) {
                const pct = Math.round((received / total) * 100);
                progressBar.value = pct;
                progressLabel.textContent = `${pct}%  —  ${formatBytes(received)} / ${formatBytes(total)}`;
            } else {
                progressBar.removeAttribute('value'); // indeterminate
                progressLabel.textContent = `${formatBytes(received)} downloaded…`;
            }
        }

        progressBar.value = 100;
        progressLabel.textContent = 'Done!';

        const blob = new Blob(chunks);
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

    } catch (err) {
        if (err.message !== 'No valid token') toast('Download failed.');
    } finally {
        dlBtn.disabled = false;
        setTimeout(() => {
            progressWrap.classList.remove('visible');
            progressBar.value = 0;
        }, 1200);
    }
}

function buildFileRow(filename) {
    const wrap = document.createElement('div');

    const row = document.createElement('div');
    row.className = 'file-row';

    const icon = document.createElement('div');
    icon.className = 'file-icon';
    icon.innerHTML = `<i class="fas ${getFileIcon(filename)}"></i>`;

    const name = document.createElement('span');
    name.className = 'file-name';
    name.textContent = filename;
    name.title = filename;

    const actions = document.createElement('div');
    actions.className = 'file-actions';

    const dlBtn = document.createElement('button');
    dlBtn.className = 'btn btn-ghost';
    dlBtn.style.padding = '.35rem .75rem';
    dlBtn.innerHTML = '<i class="fas fa-download"></i>';
    dlBtn.title = 'Download';

    const shareBtn = document.createElement('button');
    shareBtn.className = 'btn btn-ghost';
    shareBtn.style.padding = '.35rem .75rem';
    shareBtn.innerHTML = '<i class="fas fa-share-nodes"></i>';
    shareBtn.title = 'Share with PIN';
    shareBtn.addEventListener('click', () => shareFile(filename));

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger';
    delBtn.style.padding = '.35rem .75rem';
    delBtn.innerHTML = '<i class="fas fa-trash"></i>';
    delBtn.title = 'Delete';
    delBtn.addEventListener('click', () => deleteFile(filename));

    actions.appendChild(dlBtn);
    actions.appendChild(shareBtn);
    actions.appendChild(delBtn);
    row.appendChild(icon);
    row.appendChild(name);
    row.appendChild(actions);

    // Per-file progress bar
    const progressWrap  = document.createElement('div');
    progressWrap.className = 'file-progress-wrap';
    const progressBar   = document.createElement('progress');
    progressBar.max     = 100;
    progressBar.value   = 0;
    const progressLabel = document.createElement('p');
    progressLabel.className = 'file-progress-label';
    progressWrap.appendChild(progressBar);
    progressWrap.appendChild(progressLabel);

    dlBtn.addEventListener('click', () =>
        downloadFile(filename, progressBar, progressWrap, progressLabel, dlBtn));

    wrap.appendChild(row);
    wrap.appendChild(progressWrap);
    return wrap;
}

function renderFiles(files) {
    const list  = document.getElementById('fileList');
    const empty = document.getElementById('filesEmpty');
    [...list.children].forEach(c => { if (c !== empty) c.remove(); });

    if (!files || files.length === 0) {
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    files.forEach(f => list.appendChild(buildFileRow(f)));
}

async function loadFiles() {
    try {
        const res   = await fetch(`${apiUrl}/files`, { headers: getAuthHeader() });
        const files = await res.json();
        renderFiles(files);
    } catch (err) {
        if (err.message !== 'No valid token') toast('Failed to load files.');
    }
}

async function deleteFile(filename) {
    if (!confirm(`Delete "${filename}"?`)) return;
    try {
        const res = await fetch(`${apiUrl}/files/${encodeURIComponent(filename)}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });
        if (res.ok) { toast('File deleted.', 'info'); await loadFiles(); }
        else toast('Failed to delete file.');
    } catch { toast('Failed to delete file.'); }
}

// ── File input / drop zone ────────────────────────────────────────────────────
const dropZone      = document.getElementById('dropZone');
const fileInput     = document.getElementById('fileInput');
const fileSelected  = document.getElementById('fileSelected');
const selectedName  = document.getElementById('selectedFileName');
const selectedSize  = document.getElementById('selectedFileSize');
const uploadBtn     = document.getElementById('uploadButton');
const uploadProgWrap = document.getElementById('uploadProgressWrap');
const uploadProg    = document.getElementById('uploadProgress');
const uploadProgLbl = document.getElementById('uploadProgressLabel');

function showSelectedFile(file) {
    if (!file) { fileSelected.style.display = 'none'; return; }
    selectedName.textContent = file.name;
    selectedSize.textContent = formatBytes(file.size);
    fileSelected.style.display = 'block';
}

fileInput.addEventListener('change', () => showSelectedFile(fileInput.files[0]));

// Drag and drop
dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) {
        // Create a new DataTransfer to assign to the input
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
        showSelectedFile(file);
    }
});

uploadBtn.addEventListener('click', () => {
    const file = fileInput.files[0];
    if (!file) return toast('Please select a file first.');
    if (file.size > 2500 * 1024 * 1024) return toast('File exceeds 2500 MB limit.');

    const formData = new FormData();
    formData.append('file', file);

    uploadProgWrap.style.display = 'block';
    uploadProg.value = 0;
    uploadBtn.disabled = true;
    uploadProgLbl.textContent = 'Uploading…';

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${apiUrl}/upload`, true);
    xhr.setRequestHeader('Authorization', `Bearer ${getToken()}`);

    xhr.upload.onprogress = e => {
        if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            uploadProg.value = pct;
            uploadProgLbl.textContent = `${pct}%  —  ${formatBytes(e.loaded)} / ${formatBytes(e.total)}`;
        }
    };

    xhr.onload = async () => {
        uploadBtn.disabled = false;
        if (xhr.status >= 200 && xhr.status < 300) {
            uploadProg.value = 100;
            uploadProgLbl.textContent = 'Upload complete!';
            fileInput.value = '';
            showSelectedFile(null);
            toast('File uploaded!', 'success');
            await loadFiles();
        } else {
            try { toast(JSON.parse(xhr.responseText).message || 'Upload failed.'); }
            catch { toast('Upload failed.'); }
        }
        setTimeout(() => { uploadProgWrap.style.display = 'none'; uploadProg.value = 0; }, 1200);
    };

    xhr.onerror = () => {
        uploadBtn.disabled = false;
        toast('Upload failed. Check your connection.');
        setTimeout(() => { uploadProgWrap.style.display = 'none'; uploadProg.value = 0; }, 1200);
    };

    xhr.send(formData);
});

// ── Share PIN ─────────────────────────────────────────────────────────────────
async function shareFile(filename) {
    try {
        const res  = await fetch(`${apiUrl}/shares`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify({ filename, ttlHours: 24 }),
        });
        const data = await res.json();
        if (!res.ok) { toast(data.message || 'Failed to create share.'); return; }
        showShareModal(filename, data.pin, data.expiresAt);
        await loadShares();
    } catch { toast('Failed to create share.'); }
}

function showShareModal(filename, pin, expiresAt) {
    // Remove any existing modal
    document.getElementById('shareModal')?.remove();

    const shareUrl = `${window.location.origin}/share.html?pin=${pin}`;
    const expiresIn = Math.round((expiresAt - Date.now()) / 1000 / 60 / 60);

    const modal = document.createElement('div');
    modal.id = 'shareModal';
    modal.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:1000;
        display:flex;align-items:center;justify-content:center;padding:1rem;`;

    modal.innerHTML = `
        <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-lg);
                    padding:2rem;max-width:440px;width:100%;box-shadow:var(--shadow);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
                <h3 style="font-size:1rem;font-weight:600;color:var(--text);">
                    <i class="fas fa-share-nodes" style="color:var(--accent);margin-right:.5rem;"></i>
                    Share File
                </h3>
                <button id="closeShareModal" class="btn-icon"><i class="fas fa-xmark"></i></button>
            </div>
            <p style="font-size:.8rem;color:var(--text-muted);margin-bottom:1.25rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${filename}">
                ${filename}
            </p>

            <p style="font-size:.7rem;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);margin-bottom:.5rem;font-weight:600;">PIN</p>
            <div style="display:flex;gap:.6rem;margin-bottom:1.25rem;">
                <div style="flex:1;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);
                            padding:.65rem 1rem;font-size:1.75rem;font-weight:800;letter-spacing:.25em;
                            color:var(--accent);text-align:center;font-family:monospace;">
                    ${pin}
                </div>
                <button class="btn btn-ghost" id="copyPinBtn" title="Copy PIN">
                    <i class="fas fa-copy"></i>
                </button>
            </div>

            <p style="font-size:.7rem;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);margin-bottom:.5rem;font-weight:600;">Share Link</p>
            <div style="display:flex;gap:.6rem;margin-bottom:1.25rem;">
                <div style="flex:1;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);
                            padding:.65rem .85rem;font-size:.78rem;color:var(--text-dim);
                            overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                    ${shareUrl}
                </div>
                <button class="btn btn-ghost" id="copyLinkBtn" title="Copy link">
                    <i class="fas fa-copy"></i>
                </button>
            </div>

            <p style="font-size:.78rem;color:var(--text-muted);text-align:center;">
                <i class="fas fa-clock" style="margin-right:.3rem;"></i>
                Expires in ${expiresIn} hour(s) &nbsp;·&nbsp; Anyone with the PIN can download this file
            </p>
        </div>`;

    document.body.appendChild(modal);

    document.getElementById('closeShareModal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    document.getElementById('copyPinBtn').addEventListener('click', () => {
        navigator.clipboard.writeText(pin).then(() => toast('PIN copied!', 'success'));
    });
    document.getElementById('copyLinkBtn').addEventListener('click', () => {
        navigator.clipboard.writeText(shareUrl).then(() => toast('Link copied!', 'success'));
    });
}

async function loadShares() {
    try {
        const res    = await fetch(`${apiUrl}/shares`, { headers: getAuthHeader() });
        const shares = await res.json();
        renderShares(shares);
    } catch (err) {
        if (err.message !== 'No valid token') console.error('Failed to load shares');
    }
}

function renderShares(shares) {
    const container = document.getElementById('activeShares');
    const section   = document.getElementById('sharesSection');
    if (!container) return;

    const active = shares.filter(s => s.expiresAt > Date.now());
    section.style.display = active.length ? 'block' : 'none';
    container.innerHTML = '';

    active.forEach(share => {
        const row = document.createElement('div');
        row.className = 'file-row';
        row.style.marginBottom = '.4rem';

        const expiresIn = Math.round((share.expiresAt - Date.now()) / 1000 / 60 / 60);

        row.innerHTML = `
            <div class="file-icon" style="background:rgba(34,197,94,.1);">
                <i class="fas fa-link" style="color:#22c55e;"></i>
            </div>
            <div style="flex:1;overflow:hidden;">
                <div class="file-name">${share.filename}</div>
                <div style="font-size:.72rem;color:var(--text-muted);margin-top:.1rem;">
                    PIN: <strong style="color:var(--accent);font-family:monospace;letter-spacing:.1em;">${share.pin}</strong>
                    &nbsp;·&nbsp; Expires in ${expiresIn}h
                </div>
            </div>
            <div class="file-actions">
                <button class="btn btn-ghost copy-share-btn" data-pin="${share.pin}"
                        style="padding:.35rem .75rem;" title="Copy share link">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="btn btn-danger revoke-btn" data-pin="${share.pin}"
                        style="padding:.35rem .75rem;" title="Revoke">
                    <i class="fas fa-ban"></i>
                </button>
            </div>`;

        row.querySelector('.copy-share-btn').addEventListener('click', () => {
            const url = `${window.location.origin}/share.html?pin=${share.pin}`;
            navigator.clipboard.writeText(url).then(() => toast('Link copied!', 'success'));
        });
        row.querySelector('.revoke-btn').addEventListener('click', () => revokeShare(share.pin));

        container.appendChild(row);
    });
}

async function revokeShare(pin) {
    if (!confirm(`Revoke share PIN ${pin}?`)) return;
    try {
        const res = await fetch(`${apiUrl}/shares/${pin}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });
        if (res.ok) { toast('Share revoked.', 'info'); await loadShares(); }
        else toast('Failed to revoke share.');
    } catch { toast('Failed to revoke share.'); }
}

// ── Init ──────────────────────────────────────────────────────────────────────
initUser();
initNav();
loadClipboard();
loadFiles();
loadShares();
