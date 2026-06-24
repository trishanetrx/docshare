// Load environment variables before anything else
try { require('dotenv').config(); } catch { /* dotenv is optional */ }

const app  = require('./src/app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`DocShare running on http://localhost:${PORT}`);
});
