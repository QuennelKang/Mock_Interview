const axios = require('axios');
require('dotenv').config();

class AIService {
    constructor() {
        this.apiKey = process.env.DASHSCOPE_API_KEY;
        this.baseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
        this.model = 'qwen-turbo';
    }

    /**
     * Call DashScope Chat API
     * @param {Array} messages - Array of message objects {role: 'user'|'assistant', content: string}
     * @returns {Promise<Object>} - The API response data
     */
    async generateChatCompletion(messages) {
        if (!this.apiKey || this.apiKey === 'sk-your_api_key_here') {
            throw new Error('API Key not configured. Please set DASHSCOPE_API_KEY in .env file.');
        }

        try {
            const response = await axios.post(
                this.baseUrl,
                { model: this.model, messages: messages },
                { 
                    headers: { 
                        'Authorization': `Bearer ${this.apiKey}`, 
                        'Content-Type': 'application/json' 
                    } 
                }
            );
            return response.data;
        } catch (error) {
            console.error('[AIService] Error calling DashScope API:', error.response ? error.response.data : error.message);
            // Throw the error with details so the controller can handle it
            const errorInfo = error.response ? error.response.data : { message: error.message };
            throw new Error(JSON.stringify(errorInfo));
        }
    }
}

module.exports = new AIService();
