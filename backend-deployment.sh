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

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

let clipboardData = [];

// POST route to save clipboard data
app.post('/clipboard', (req, res) => {
    const { text } = req.body;
    clipboardData.push(text);
    res.status(201).send({ message: 'Text added to clipboard', data: clipboardData });
});

// GET route to load clipboard data
app.get('/clipboard', (req, res) => {
    res.status(200).send(clipboardData);
});

// DELETE route to clear clipboard data
app.delete('/clipboard', (req, res) => {
    clipboardData = [];  // Clear the clipboard data
    res.status(200).send({ message: 'Clipboard cleared.' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
EOL

# Start the backend server
echo "Starting backend server..."
nohup node ~/clipboard-backend/server.js &

# Configure NGINX to proxy requests to the backend
echo "Configuring NGINX..."
sudo cat <<EOL > /etc/nginx/sites-available/clipboard-backend
server {
    listen 80;
    server_name negombotech.com www.negombotech.com;

    location / {
        proxy_pass http://localhost:3000;  # Backend runs on port 3000
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
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
