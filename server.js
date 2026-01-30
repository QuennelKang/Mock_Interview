const express = require('express');
const path = require('path');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();
const cors = require('cors'); // Added CORS support

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

    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey || apiKey === 'sk-your_api_key_here') {
        return res.status(500).json({ error: 'API Key not configured. Please set DASHSCOPE_API_KEY in .env file.' });
    }

    try {
        const response = await axios.post(
            'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
            {
                model: 'qwen-turbo',
                messages: messages
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error('Error calling DashScope API:', error.response ? error.response.data : error.message);
        res.status(500).json({ 
            error: 'Failed to get response from AI',
            details: error.response ? error.response.data : error.message
        });
    }
});

// Fallback route for SPA or just to ensure index.html is served
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
