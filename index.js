const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config();
const cors = require('cors'); // Added CORS support
const axios = require('axios');
const https = require('https');
const nodemailer = require('nodemailer');

// Import Services
const aiService = require('./services/aiService');
const ttsService = require('./services/ttsService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json({ limit: '50mb' })); // Increase limit for large resume content
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Admin Auth Route ---
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USERNAME;
    const adminPass = process.env.ADMIN_PASSWORD;

    if (!adminUser || !adminPass) {
        console.error('Admin credentials not configured in .env');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    if (username === adminUser && password === adminPass) {
        // In a real app, generate a JWT token here
        return res.json({ success: true, user: username });
    } else {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Chat API Route
app.post('/api/chat', async (req, res) => {
    const { messages, stream = false } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Invalid messages format' });
    }

    try {
        if (stream) {
            // 7. 性能优化：流式传输 (Streaming)
            // 设置 SSE (Server-Sent Events) 头
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            
            // 获取流对象
            const aiStream = await aiService.generateChatCompletion(messages, true);
            
            // 将 AI 服务返回的流 pipe 到响应流
            aiStream.pipe(res);
            
            // 处理流结束和错误
            aiStream.on('error', (err) => {
                console.error('Stream error:', err);
                res.end(); // 结束响应
            });
            
            // 注意：不要在这里调用 res.json() 或 res.end()，让 pipe 处理
        } else {
            // 普通模式
            const data = await aiService.generateChatCompletion(messages, false);
            res.json(data);
        }
    } catch (error) {
        // 如果头部已发送（例如流式开始后出错），不能再发送 JSON 错误
        if (res.headersSent) {
            console.error('Error after headers sent:', error);
            res.end();
            return;
        }

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

app.post('/api/generate-prompt', (req, res) => {
    try {
        const { fileContent, formData } = req.body;
        if (!fileContent || !formData) {
            return res.status(400).json({ error: 'Missing required data' });
        }
        
        const systemPrompt = aiService.generateSystemPrompt({ fileContent, formData });
        res.json({ systemPrompt });
    } catch (error) {
        console.error('Error generating prompt:', error);
        res.status(500).json({ error: 'Failed to generate prompt' });
    }
});

app.post('/api/analyze-url', async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        console.log(`[Analyze URL] Fetching: ${url}`);
        // Basic fetch using axios with SSL verification disabled
        const httpsAgent = new https.Agent({  
            rejectUnauthorized: false
        });

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
                'Cache-Control': 'max-age=0',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout: 10000,
            httpsAgent: httpsAgent
        });
        
        let html = response.data;
        if (typeof html !== 'string') {
             html = JSON.stringify(html);
        }
        
        // Basic HTML cleanup to get text content
        const textContent = html
            .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "")
            .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gm, "")
            .replace(/<[^>]+>/g, "\n")
            .replace(/\s+/g, " ")
            .trim();

        const result = await aiService.analyzeJobContent(textContent);
        res.json(result);

    } catch (error) {
        console.error('[Analyze URL] Error:', error.message);
        
        let errorMessage = error.message;
        if (error.response) {
            if (error.response.status === 451) {
                errorMessage = "该网站因法律或地区限制无法访问 (451)。建议您直接复制职位描述内容手动填写。";
            } else if (error.response.status === 403) {
                errorMessage = "该网站开启了反爬虫保护 (403)，无法自动获取。建议您直接复制职位描述内容手动填写。";
            } else if (error.response.status === 404) {
                errorMessage = "未找到该页面 (404)，请检查网址是否正确。";
            }
        }
        
        res.status(500).json({ error: 'Failed to analyze URL', details: errorMessage });
    }
});

// Feedback API Route
app.post('/api/feedback', async (req, res) => {
    const { type, description, email } = req.body;
    
    if (!description) {
        return res.status(400).json({ error: 'Feedback description is required' });
    }

    console.log(`[Feedback] Received: ${type} - ${email}`);

    // Create transporter
    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'qq',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'QuennelKang@foxmail.com',
        subject: `New Feedback Received: ${type}`,
        text: `
Type: ${type}
From: ${email || 'Anonymous'}
Time: ${new Date().toLocaleString()}

Description:
${description}
        `
    };

    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn('[Feedback] Email credentials not configured. Logging only.');
            return res.json({ success: true, message: 'Feedback received (Email not configured)' });
        }

        await transporter.sendMail(mailOptions);
        console.log('[Feedback] Email sent successfully');
        res.json({ success: true });
    } catch (error) {
        console.error('[Feedback] Failed to send email:', error);
        res.status(500).json({ error: 'Failed to send feedback email' });
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
