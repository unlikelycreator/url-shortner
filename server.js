const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const shortid = require('shortid');
const cors = require('cors');

const app = express();
const PORT = 8082; // Change if needed
const BASE_URL = 'https://midastouch.onrender.com'; // Your API’s base URL
const JSON_FILE = path.join(__dirname, 'urls.json');

// Middleware to parse JSON bodies
app.use(express.json());

// Configure CORS to allow all origins, with specific origins listed
app.use(cors({
    origin: ['http://localhost:5173', 'http://198.38.87.73:8085', '*', 'http://103.118.16.25', "http://103.118.16.25:8081"], // Allow specific origins and all (*)
    methods: ['GET', 'POST'], // Allow only GET and POST methods
    allowedHeaders: ['Content-Type'], // Allow Content-Type header
}));

// Initialize JSON file if it doesn’t exist
async function initializeJsonFile() {
    try {
        await fs.access(JSON_FILE);
    } catch (error) {
        await fs.writeFile(JSON_FILE, JSON.stringify({}));
    }
}

// Read URLs from JSON file
async function readUrls() {
    const data = await fs.readFile(JSON_FILE, 'utf8');
    return JSON.parse(data);
}

// Write URLs to JSON file
async function writeUrls(urls) {
    await fs.writeFile(JSON_FILE, JSON.stringify(urls, null, 2));
}

// POST /shorten: Create a shortened URL
app.post('/shorten', async (req, res) => {
    try {
        const { longUrl } = req.body;
        if (!longUrl || !longUrl.startsWith('http')) {
            return res.status(400).json({ error: 'Invalid or missing longUrl' });
        }

        const urls = await readUrls();
        const id = shortid.generate(); // Generate unique ID (e.g., id123)
        urls[id] = longUrl; // Store mapping
        await writeUrls(urls);

        const shortUrl = `${BASE_URL}/${id}`;
        res.json({ shortUrl });
    } catch (error) {
        console.error('Error in /shorten:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /:id: Redirect to the long URL
app.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const urls = await readUrls();

        if (urls[id]) {
            res.redirect(301, urls[id]); // Permanent redirect to long URL
        } else {
            res.status(404).json({ error: 'Short URL not found' });
        }
    } catch (error) {
        console.error('Error in /:id:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Initialize JSON file and start server
initializeJsonFile().then(() => {
    app.listen(PORT, () => {
        console.log(`URL Shortener API running on http://localhost:${PORT}`);
    });
});
