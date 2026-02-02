const axios = require('axios');
require('dotenv').config();

class TTSService {
    constructor() {
        this.apiKey = process.env.DASHSCOPE_API_KEY;
        this.baseUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
        this.model = 'qwen3-tts-flash';
    }

    /**
     * Call DashScope TTS API
     * @param {string} text - The text to convert to speech
     * @returns {Promise<string>} - The audio URL
     */
    async generateSpeech(text) {
        if (!this.apiKey) {
            throw new Error('API Key not configured');
        }

        const payload = {
            model: this.model,
            input: { text: text },
            parameters: {}
        };

        console.log('[TTSService] Sending payload to DashScope:', JSON.stringify(payload));

        try {
            const response = await axios.post(
                this.baseUrl,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            console.log('[TTSService] DashScope Response Status:', response.status);
            
            if (response.data && response.data.output && response.data.output.audio && response.data.output.audio.url) {
                console.log('[TTSService] Success, Audio URL:', response.data.output.audio.url);
                return response.data.output.audio.url;
            } else {
                console.error('[TTSService Error] Invalid response structure:', JSON.stringify(response.data));
                throw new Error('Invalid response from TTS API');
            }
        } catch (error) {
            const errorDetails = error.response ? error.response.data : error.message;
            console.error('[TTSService Error] Details:', JSON.stringify(errorDetails));
            // Wrap error to ensure details are preserved
            throw new Error(JSON.stringify(errorDetails));
        }
    }
}

module.exports = new TTSService();
