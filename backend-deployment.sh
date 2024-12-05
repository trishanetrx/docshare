#!/bin/bash

# Update system and install necessary dependencies
echo "Updating system and installing dependencies..."
sudo apt update -y
sudo apt upgrade -y
sudo apt install -y nodejs npm nginx certbot python3-certbot-nginx

# Install backend dependencies (express, cors)
echo "Setting up backend and installing Node.js dependencies..."
mkdir -p ~/clipboard-backend
cd ~/clipboard-backend
npm init -y
npm install express cors

# Create the server.js file
cat <<EOL > ~/clipboard-backend/server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files

// Memory storage for clipboard data
let clipboardData = [];

// Custom storage configuration to preserve the original file name
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads')); // Define the upload folder
    },
    filename: (req, file, cb) => {
        // Preserve the original file name and add a timestamp to avoid conflicts
        const ext = path.extname(file.originalname); // Get file extension
        const filename = file.originalname.replace(ext, '') + '-' + Date.now() + ext; // Custom filename
        cb(null, filename); // Use the custom filename
    }
});

// Configure multer with the custom storage
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});

// Clipboard API Routes

// POST route to save clipboard data
app.post('/clipboard', (req, res) => {
    const { text } = req.body;
    clipboardData.push(text);
    res.status(201).send({ message: 'Text added to clipboard', data: clipboardData });
});

// GET route to retrieve clipboard data
app.get('/clipboard', (req, res) => {
    res.status(200).send(clipboardData);
});

// DELETE route to clear clipboard data
app.delete('/clipboard', (req, res) => {
    clipboardData = [];
    res.status(200).send({ message: 'Clipboard cleared.' });
});

// File Upload API Routes

// POST route to upload a file
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send({ message: 'No file uploaded.' });
    }
    res.status(200).send({ message: 'File uploaded successfully.', file: req.file.filename });
});

// GET route to list all uploaded files
app.get('/files', (req, res) => {
    const uploadsDir = path.join(__dirname, 'uploads');
    fs.readdir(uploadsDir, (err, files) => {
        if (err) {
            return res.status(500).send({ message: 'Failed to load files.' });
        }
        res.status(200).send(files);
    });
});

// GET route to download a specific file by its filename
app.get('/files/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.params.filename);
    res.download(filePath, (err) => {
        if (err) {
            res.status(404).send({ message: 'File not found.' });
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
EOL

# Create symbolic link to enable the NGINX site
sudo ln -s /etc/nginx/sites-available/clipboard-backend /etc/nginx/sites-enabled/

# Test NGINX configuration
echo "Testing NGINX configuration..."
sudo nginx -t

# Restart NGINX service
echo "Restarting NGINX..."
sudo systemctl restart nginx

# Obtain SSL certificate using Certbot
echo "Obtaining SSL certificate..."
sudo certbot --nginx -d negombotech.com -d www.negombotech.com --agree-tos --non-interactive --email mytest@negombo.com

# Reload NGINX to apply SSL
echo "Reloading NGINX to apply SSL..."
sudo systemctl reload nginx

echo "Deployment completed successfully!"
