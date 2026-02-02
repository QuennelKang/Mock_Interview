const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config();
const cors = require('cors'); // Added CORS support

// Import Services
const aiService = require('./services/aiService');
const ttsService = require('./services/ttsService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Chat API Route
app.post('/api/chat', async (req, res) => {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Invalid messages format' });
    }

    try {
        const data = await aiService.generateChatCompletion(messages);
        res.json(data);
    } catch (error) {
        let errorMsg = error.message;
        try {
            // Try to parse if it's a JSON string from our service
            errorMsg = JSON.parse(error.message);
        } catch (e) {
            // keep as string
        }
        res.status(500).json({ error: 'Failed to get response from AI', details: errorMsg });
    }
});

app.post('/api/tts', async (req, res) => {
    const { text } = req.body;
    console.log(`[TTS Request] Text: ${text?.substring(0, 50)}...`);

    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }

    try {
        const audioUrl = await ttsService.generateSpeech(text);
        res.json({ audioUrl });
    } catch (error) {
        let errorMsg = error.message;
        try {
            errorMsg = JSON.parse(error.message);
        } catch (e) {
            // keep as string
        }
        res.status(500).json({ error: 'Failed to generate speech', details: errorMsg });
    }
});

// Fallback route for SPA or just to ensure index.html is served
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Server is also accessible on http://127.0.0.1:${PORT}`);
});
