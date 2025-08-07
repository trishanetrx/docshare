#!/bin/bash
set -e

DOMAIN="copythingz.shop"
EMAIL="admin@$DOMAIN"  # Change if needed
APP_DIR="/root/clipboard-backend"
UPLOADS_DIR="$APP_DIR/uploads"
NGINX_CONF="/etc/nginx/sites-available/clipboard-backend"

echo "📦 Updating system and installing dependencies..."
apt update -y
apt install -y curl git nginx certbot python3-certbot-nginx nodejs npm

echo "🛠 Ensuring Node.js version is correct..."
NODE_VERSION=$(node -v || true)
if [[ "$NODE_VERSION" != v20* ]]; then
  echo "Installing Node.js v20.x..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi

echo "⚙️ Setting up clipboard backend directory..."
mkdir -p "$UPLOADS_DIR"
cd "$APP_DIR"

echo "📁 Writing server.js..."
cat <<'EOF' > "$APP_DIR/server.js"
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Secret key for JWT signing
const JWT_SECRET = '870293100v'; // Replace with a strong key in production

// Middleware configuration
app.use(cors({
    //origin: 'https://clipboard.copythingz.shop', // Allow requests from Netlify frontend
    origin: ['https://copythingz.shop', 'https://clipboard.copythingz.shop', 'https://copythingz.netlify.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files

// Handle CORS preflight requests
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', 'https://clipboard.copythingz.shop');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.sendStatus(204); // Respond with no content for preflight
});

// Add /api prefix to all routes
const router = express.Router();

// In-memory user store (for demo purposes)
let users = [];

// Custom storage configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `${file.originalname.replace(ext, '')}-${Date.now()}${ext}`; // Fixed syntax
        cb(null, filename);
    }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50 MB limit

// Routes

// User Registration
router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send({ message: 'Username and password are required.' });
    }

    const existingUser = users.find(user => user.username === username);
    if (existingUser) {
        return res.status(400).send({ message: 'User already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ username, password: hashedPassword });
    res.status(201).send({ message: 'User registered successfully.' });
});

// User Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const user = users.find(user => user.username === username);
    if (!user) {
        return res.status(400).send({ message: 'Invalid username or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(400).send({ message: 'Invalid username or password.' });
    }

    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '1h' });
    res.status(200).send({ message: 'Login successful.', token });
});

// Middleware for authentication
function authenticate(req, res, next) {
    const authHeader = req.header('Authorization');
    const token = authHeader ? authHeader.split(' ')[1] : null; // Extract token

    if (!token) {
        console.log('No token provided'); // Debug log
        return res.status(401).send({ message: 'No token, authorization denied.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('Decoded token:', decoded); // Debug log
        req.user = decoded;
        next();
    } catch (err) {
        console.log('Invalid token:', err.message); // Debug log
        res.status(401).send({ message: 'Invalid token.' });
    }
}

// Clipboard API
let clipboardData = [];

// Save clipboard data
router.post('/clipboard', authenticate, (req, res) => {
    const { text } = req.body;
    clipboardData.push(text);
    res.status(201).send({ message: 'Text added to clipboard.', data: clipboardData });
});

// Retrieve clipboard data
router.get('/clipboard', authenticate, (req, res) => {
    res.status(200).send(clipboardData);
});

// Clear clipboard data
router.delete('/clipboard', authenticate, (req, res) => {
    clipboardData = [];
    res.status(200).send({ message: 'Clipboard cleared.' });
});

// File Upload API

// Upload a file
router.post('/upload', authenticate, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send({ message: 'No file uploaded.' });
    }
    res.status(200).send({ message: 'File uploaded successfully.', file: req.file.filename });
});

// List all uploaded files
router.get('/files', authenticate, (req, res) => {
    const uploadsDir = path.join(__dirname, 'uploads');
    fs.readdir(uploadsDir, (err, files) => {
        if (err) {
            return res.status(500).send({ message: 'Failed to load files.' });
        }
        res.status(200).send(files);
    });
});

// Download a file
router.get('/files/:filename', authenticate, (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.params.filename);
    res.download(filePath, (err) => {
        if (err) {
            res.status(404).send({ message: 'File not found.' });
        }
    });
});

// Delete a file
router.delete('/files/:filename', authenticate, (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.params.filename);
    fs.unlink(filePath, (err) => {
        if (err) {
            return res.status(404).send({ message: 'File not found or could not be deleted.' });
        }
        res.status(200).send({ message: 'File deleted successfully.' });
    });
});

// Use /api prefix for all routes
app.use('/api', router);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
EOF

echo "📝 Writing package.json and installing dependencies..."
npm init -y
npm install express@4 cors multer bcryptjs jsonwebtoken body-parser

echo "🚀 Installing PM2 and starting app..."
npm install -g pm2
pm2 stop clipboard-backend || true
pm2 delete clipboard-backend || true
pm2 start "$APP_DIR/server.js" --name clipboard-backend
pm2 save
pm2 startup systemd -u root --hp /root

echo "🌐 Configuring NGINX..."
cat <<EOF > "$NGINX_CONF"
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        return 301 https://\$host\$request_uri;
    }
}
EOF

echo "🔗 Enabling NGINX site and disabling default..."
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/clipboard-backend
rm -f /etc/nginx/sites-enabled/default

echo "🔍 Testing and reloading NGINX (HTTP only)..."
nginx -t
systemctl reload nginx

echo "🔐 Requesting SSL certificate from Let's Encrypt..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN --agree-tos --email "$EMAIL" --non-interactive

echo "📝 Rewriting NGINX config with SSL and backend proxy..."
cat <<EOF > "$NGINX_CONF"
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 700M;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;

        if (\$request_method = OPTIONS) {
            add_header Access-Control-Allow-Origin \$http_origin always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
            add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
            add_header 'Content-Length' 0;
            add_header 'Content-Type' 'text/plain';
            return 204;
        }
    }

    location /uploads/ {
        alias $UPLOADS_DIR;
        try_files \$uri \$uri/ =404;
        add_header Cache-Control "public, max-age=3600";
    }

    error_log /var/log/nginx/${DOMAIN}_error.log;
    access_log /var/log/nginx/${DOMAIN}_access.log;
}
EOF

echo "🔁 Reloading NGINX with SSL config..."
nginx -t
systemctl reload nginx

echo "✅ Deployment completed successfully!"
echo "Visit: https://$DOMAIN/api"
