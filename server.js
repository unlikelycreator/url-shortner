const express = require('express');
const { MongoClient } = require('mongodb');
const shortid = require('shortid');
const cors = require('cors');

const app = express();
const PORT = 8082;
const BASE_URL = 'https://midastouch.onrender.com';
const MONGODB_URI = 'mongodb+srv://hpMidas:midas@cluster0.jdd0dfh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'urlShortener';
const COLLECTION_NAME = 'urls';

app.use(express.json());
app.use(cors({
    origin: ['http://localhost:5173', 'http://198.38.87.73:8085', 'http://103.118.16.25', 'http://103.118.16.25:8081'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));

let db;

// Connect to MongoDB and set up TTL index
async function connectToMongo() {
    const client = new MongoClient(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    db = client.db(DB_NAME);
    console.log('Connected to MongoDB');

    // Create TTL index to expire URLs after 1 day (86400 seconds)
    await db.collection(COLLECTION_NAME).createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 });
}

// POST /shorten: Create a shortened URL
app.post('/shorten', async (req, res) => {
    try {
        const { longUrl } = req.body;
        if (!longUrl || !longUrl.startsWith('http')) {
            return res.status(400).json({ error: 'Invalid or missing longUrl' });
        }

        const id = shortid.generate();
        const createdAt = new Date();

        await db.collection(COLLECTION_NAME).insertOne({ id, longUrl, createdAt });
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
        const urlDoc = await db.collection(COLLECTION_NAME).findOne({ id });

        if (urlDoc) {
            res.redirect(301, urlDoc.longUrl);
        } else {
            res.status(404).json({ error: 'Short URL not found' });
        }
    } catch (error) {
        console.error('Error in /:id:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Initialize MongoDB and start server
connectToMongo().then(() => {
    app.listen(PORT, () => {
        console.log(`URL Shortener API running on http://localhost:${PORT}`);
    });
}).catch((error) => {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
});
