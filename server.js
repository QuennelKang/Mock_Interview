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
                    { model: 'qwen-turbo', messages: messages },
                    { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
                );
                res.json(response.data);
            } catch (error) {
                console.error('Error calling DashScope API:', error.response ? error.response.data : error.message);
                res.status(500).json({ error: 'Failed to get response from AI', details: error.response ? error.response.data : error.message });
            }
        });

app.post('/api/tts', async (req, res) => {
    const { text } = req.body;
    console.log(`[TTS Request] Text: ${text?.substring(0, 50)}...`);

    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }
    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
        console.error('[TTS Error] API Key missing');
        return res.status(500).json({ error: 'API Key not configured' });
    }

    try {
        const payload = {
            model: 'qwen3-tts-flash',
            input: {
                text: text,
                // voice: 'LongWan' // Commented out to see if default works or if 'LongWan' was invalid
            },
            parameters: {}
        };
        
        console.log('[TTS] Sending payload to DashScope:', JSON.stringify(payload));

        const response = await axios.post(
            'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('[TTS] DashScope Response Status:', response.status);
        
        if (response.data && response.data.output && response.data.output.audio && response.data.output.audio.url) {
            console.log('[TTS] Success, Audio URL:', response.data.output.audio.url);
            res.json({ audioUrl: response.data.output.audio.url });
        } else {
            console.error('[TTS Error] Invalid response structure:', JSON.stringify(response.data));
            throw new Error('Invalid response from TTS API');
        }
    } catch (error) {
        const errorDetails = error.response ? error.response.data : error.message;
        console.error('[TTS Error] Details:', JSON.stringify(errorDetails));
        res.status(500).json({ error: 'Failed to generate speech', details: errorDetails });
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
