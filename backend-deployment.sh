#!/bin/bash

# Update system and install necessary dependencies
echo "Updating system and installing dependencies..."
sudo apt update -y
sudo apt upgrade -y
sudo apt install -y nodejs npm nginx certbot python3-certbot-nginx 

# Install backend dependencies (express, cors)
echo "Setting up backend and installing Node.js dependencies..."
mkdir -p ~/clipboard-backend
mkdir -p ~/clipboard-backend/uploads
cd ~/clipboard-backend
npm init -y
npm install express cors
npm install multer
npm install -g pm2
npm install
npm install express cors multer bcryptjs jsonwebtoken body-parser

#Clone and Move Certificate files
git clone https://github.com/trishanetrx/docshare.git /tmp/docshare

sudo mkdir -p /etc/letsencrypt/live/negombotech.com/
sudo mkdir -p /etc/letsencrypt/

# Move the files
sudo mv /tmp/docshare/cert.pem /etc/letsencrypt/live/negombotech.com/fullchain.pem
sudo mv /tmp/docshare/privkey.pem /etc/letsencrypt/live/negombotech.com/privkey.pem
sudo mv /tmp/docshare/options-ssl-nginx.conf /etc/letsencrypt/options-ssl-nginx.conf
sudo mv /tmp/docshare/ssl-dhparams.pem /etc/letsencrypt/ssl-dhparams.pem

# Create the server.js file
cat <<EOL > ~/clipboard-backend/server.js
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
const JWT_SECRET = 'your-secure-secret-key'; // Replace with a strong key in production

// Middleware configuration
app.use(cors({
    origin: 'https://clipboard.negombotech.com', // Allow requests from Netlify frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files

// Handle CORS preflight requests
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', 'https://clipboard.negombotech.com');
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
        const filename = \`\${file.originalname.replace(ext, '')}-\${Date.now()}\${ext}\`; // Fixed syntax
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
    console.log(\`Server is running on http://localhost:\${PORT}\`);
});
EOL

# Restart backend using PM2
pm2 stop clipboard-backend || true
pm2 delete clipboard-backend || true
pm2 start ~/clipboard-backend/server.js --name clipboard-backend

# Configure NGINX to proxy requests to the backend
echo "Configuring NGINX..."
NGINX_CONF="/etc/nginx/sites-available/clipboard-backend"
if [ -f "$NGINX_CONF" ]; then
    echo "Removing existing NGINX configuration..."
    sudo rm "$NGINX_CONF"
fi

cat <<EOL | sudo tee "$NGINX_CONF"
server {
    listen 80;
    server_name negombotech.com www.negombotech.com;

    # Redirect HTTP to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name negombotech.com www.negombotech.com;

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/negombotech.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/negombotech.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 70M;

    # Proxy API requests to the backend
    location /api/ {
        proxy_pass http://localhost:3000; # Proxy to Node.js backend
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;

        # CORS Headers
       # add_header 'Access-Control-Allow-Origin' 'https://clipboard.negombotech.com' always;
       # add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
       # add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;

        # Handle preflight OPTIONS requests
        if ($request_method = OPTIONS) {
            add_header 'Access-Control-Allow-Origin' 'https://clipboard.negombotech.com' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
            add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
            add_header 'Content-Length' 0;
            add_header 'Content-Type' 'text/plain';
            return 204;
        }
    }

    # Serve uploaded files
    location /uploads/ {
        alias /root/clipboard-backend/uploads;
        try_files $uri $uri/ =404;
        add_header Cache-Control "public, max-age=3600";
    }

    error_log /var/log/nginx/negombotech_error.log;
    access_log /var/log/nginx/negombotech_access.log;
}
EOL

# Enable the NGINX site
sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/

# Test NGINX configuration
echo "Testing NGINX configuration..."
sudo nginx -t || { echo "NGINX configuration test failed!"; exit 1; }

# Restart NGINX service
echo "Restarting NGINX..."
sudo systemctl restart nginx || { echo "NGINX restart failed!"; exit 1; }

# Obtain SSL certificate using Certbot
#echo "Obtaining SSL certificate..."
#sudo certbot --nginx -d negombotech.com -d www.negombotech.com --agree-tos --non-interactive --email mytest@negombo.com

# Reload NGINX to apply SSL
echo "Reloading NGINX to apply SSL..."
sudo systemctl reload nginx

echo "Deployment completed successfully!"
