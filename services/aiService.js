const axios = require('axios');
require('dotenv').config();

class AIService {
    constructor() {
        this.apiKey = process.env.DASHSCOPE_API_KEY;
        this.baseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
        this.model = 'qwen-turbo';
    }

    /**
     * Call DashScope Chat API with advanced handling
     * @param {Array} messages - Array of message objects {role: 'user'|'assistant'|'system', content: string}
     * @param {boolean} stream - Whether to stream the response
     * @returns {Promise<Object|ReadableStream>} - The API response data or stream
     */
    async generateChatCompletion(messages, stream = false) {
        if (!this.apiKey || this.apiKey === 'sk-your_api_key_here') {
            throw new Error('API Key not configured. Please set DASHSCOPE_API_KEY in .env file.');
        }

        // 1. System Prompt 永恒化 (Persistence)
        // 确保 system 消息始终在消息数组首位
        // 找到 system message
        const systemMessageIndex = messages.findIndex(m => m.role === 'system');
        let systemMessage = null;
        
        if (systemMessageIndex !== -1) {
            systemMessage = messages[systemMessageIndex];
            // 从原数组移除
            messages.splice(systemMessageIndex, 1);
        }

        // 2. 滑动窗口 (Sliding Window)
        // 保留最近 N 条问答 (例如最近 10 条)，防止上下文过长
        const WINDOW_SIZE = 10; 
        if (messages.length > WINDOW_SIZE) {
            messages = messages.slice(-WINDOW_SIZE);
        }

        // 重组消息数组：System Message + Sliding Window Messages
        const finalMessages = systemMessage ? [systemMessage, ...messages] : messages;

        try {
            // 7. 性能优化：流式传输 (Streaming)
            const response = await axios.post(
                this.baseUrl,
                { 
                    model: this.model, 
                    messages: finalMessages,
                    stream: stream, // 支持流式输出
                    incremental_output: stream // DashScope 特定参数，增量输出
                },
                { 
                    headers: { 
                        'Authorization': `Bearer ${this.apiKey}`, 
                        'Content-Type': 'application/json',
                        ...(stream ? { 'Accept': 'text/event-stream' } : {})
                    },
                    responseType: stream ? 'stream' : 'json'
                }
            );

            // 6. 响应的“确定性”控制 (Deterministic Control)
            // 拦截器逻辑：在非流式模式下简单处理，流式模式需要在前端处理或中间件处理
            // 这里我们主要在非流式下做检测
            if (!stream && response.data && response.data.choices && response.data.choices.length > 0) {
                const content = response.data.choices[0].message.content;
                // 简单的中文检测正则
                if (/[\u4e00-\u9fa5]/.test(content)) {
                    console.warn('[AIService] Detected Chinese in response, requesting rephrase...');
                    // 递归调用自己，追加纠正指令
                    // 注意：为了防止死循环，这里可以加个计数器或者简单处理
                    // 为简单起见，我们这里只是返回一个特殊的标记或者自动重试一次（略复杂），
                    // 或者直接在 System Prompt 里加强约束。
                    // 按照用户要求："如果 AI 回复里包含中文字符，自动给 AI 发送一条隐藏指令"
                    
                    // 添加纠正指令到临时消息列表
                    const correctionMessages = [...finalMessages, {
                        role: 'assistant',
                        content: content
                    }, {
                        role: 'user',
                        content: "Please rephrase your last response in English only. Strict Protocol #6."
                    }];
                    
                    // 再次请求 (非流式)
                    return this.generateChatCompletion(correctionMessages, false);
                }
            }

            return stream ? response.data : response.data;
        } catch (error) {
            // 3. 异常处理与“优雅降级” (Error Handling)
            console.error('[AIService] Error calling DashScope API:', error.response ? error.response.data : error.message);
            
            // 构造标准错误格式
            const errorInfo = error.response ? error.response.data : { message: error.message };
            
            // 优雅降级：如果是因为上下文过长 (Context Limit)，可以尝试进一步缩减窗口重试 (此处仅为示例思路)
            if (errorInfo.code === 'InvalidParameter' && errorInfo.message.includes('tokens')) {
                console.warn('[AIService] Token limit exceeded, retrying with smaller window...');
                // 递归重试逻辑可在此实现
            }

            throw new Error(JSON.stringify(errorInfo));
        }
    }
    /**
     * Analyze job content from URL text and extract structured data
     * @param {string} content - The raw text content of the job page
     * @returns {Promise<Object>} - The extracted job details
     */
    async analyzeJobContent(content) {
        if (!content) throw new Error('No content provided for analysis');

        // Truncate content if too long to avoid token limits
        const truncatedContent = content.substring(0, 15000); 

        const systemPrompt = `
You are an intelligent assistant. Your task is to extract job details from the provided text.
Please extract the following information and return it in a strictly valid JSON format:
- companyName
- positionName
- companyDescription (summary of the company, max 200 chars)
- jobDescription (summary of the role, max 500 chars)
- jobRequirements (key requirements, max 500 chars)

Ensure all extracted content is in ENGLISH. If the original text is in another language, translate it to English.
If a field is not found, use an empty string. Do not include any markdown formatting (like \`\`\`json) in the response, just the raw JSON string.
`;

        const userMessage = `Here is the job posting text:\n\n${truncatedContent}`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ];

        try {
            const response = await this.generateChatCompletion(messages, false);
            let content = "";
            if (response.choices && response.choices.length > 0) {
                 content = response.choices[0].message.content;
            } else {
                 throw new Error("Invalid AI response structure");
            }
            
            // Clean up if markdown code blocks are present despite instructions
            content = content.replace(/```json/g, '').replace(/```/g, '').trim();
            
            return JSON.parse(content);
        } catch (error) {
            console.error('[AIService] Analysis failed:', error);
            throw new Error('Failed to analyze job content: ' + error.message);
        }
    }

    /**
     * Generate the system prompt for the interview
     * @param {Object} data - The data needed to generate the prompt
     * @param {string} data.fileContent - The resume content
     * @param {Object} data.formData - The form data (position, company, etc.)
     * @returns {string} - The generated system prompt
     */
    generateSystemPrompt(data) {
        const { fileContent, formData } = data;
        
        // Calculate time greeting based on server time (or passed from client if timezone matters, but simple is fine)
        const hour = new Date().getHours();
        let timeGreeting = 'Good morning';
        if (hour >= 12 && hour < 18) timeGreeting = 'Good afternoon';
        else if (hour >= 18) timeGreeting = 'Good evening';

        // Generate randomized interview stages
        const middleStages = [
            "Motivation & Fit",
            "Work Experience & Achievements",
            "Behavioral Questions",
            "Technical / Role-specific Skills",
            "Career Goals & Self-awareness",
            "Hypothetical / Situational Questions"
        ];
        
        // Fisher-Yates shuffle
        for (let i = middleStages.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [middleStages[i], middleStages[j]] = [middleStages[j], middleStages[i]];
        }
        
        const interviewStagesList = [
            "Self-introduction",
            ...middleStages,
            "Your Questions for the Interviewer"
        ].map(stage => `           - ${stage}`).join('\n');

        const systemPrompt = `
        Background: 
        - Candidate Resume: ${fileContent}
        - Targeted Position: ${formData.position}
        - Company Context: ${formData.companyDescription || 'Leading firm in this sector'}
        - JD Details: ${formData.jobDescription}
        - Requirements: ${formData.jobRequirements}

        Task: You are a high-level ${formData.position} Hiring Manager. Conduct a rigorous mock interview.

        Strict Protocol:
        1. FIRST RESPONSE: Start ONLY with "Hello! I am [Interviewer Name], your interviewer today. ${timeGreeting}, [First Question]". No meta-talk.
        2. SUBSEQUENT RESPONSES: Provide 1-2 sentences of professional feedback on the previous answer (e.g., "Clear explanation of the architecture, though I'd like to see more focus on the 'why'."), then ask exactly ONE follow-up question.Vary the feedback phrasing to keep the conversation natural; avoid repetitive templates.
        3. RESUME ANCHORING: Every question must link a requirement from the JD to a specific project or skill mentioned in the candidate's resume. Do not invent scenarios outside their provided experience.
        4. DRILL DOWN: If an answer is high-level, the next question must demand specific metrics, technologies used, or "lessons learned" from that specific resume entry.
        5. INTERVIEW STAGES: The interview must progress through these distinct stages:
${interviewStagesList}
        When transitioning between stages, use a natural transitional phrase (e.g., "Moving on from your ${formData.position} background, I'd like to discuss...").
        6. LANGUAGE: Use professional, natural English only. If the candidate's resume or JD contains non-English proper nouns (like company names), TRANSLATE them into English in your response. Do not repeat the question. No Markdown formatting, no code blocks, no Chinese.

        Begin the interview now.
        `;

        return systemPrompt;
    }
}

module.exports = new AIService();
