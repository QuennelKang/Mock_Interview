
const ConversationState = {
    // Keys for localStorage
    STORAGE_KEY: 'mock_interview_history',
    SYSTEM_PROMPT_KEY: 'interview_system_prompt',

    // In-memory state
    history: [],

    /**
     * Initialize state from storage
     */
    init() {
        try {
            const storedHistory = localStorage.getItem(this.STORAGE_KEY);
            if (storedHistory) {
                this.history = JSON.parse(storedHistory);
                console.log('[ConversationState] Loaded history from storage:', this.history.length, 'messages');
            } else {
                this.history = [];
                console.log('[ConversationState] No history found, starting fresh.');
            }
        } catch (e) {
            console.error('[ConversationState] Error loading history:', e);
            this.history = [];
        }
    },

    /**
     * Get current history (returns a copy to prevent direct mutation issues if needed, 
     * but for now direct reference is fine for performance with large arrays, 
     * just be careful not to mutate without calling save)
     */
    getHistory() {
        return this.history;
    },

    /**
     * Add a message to the history and save
     * @param {string} role - 'user', 'assistant', or 'system'
     * @param {string} content - The message content
     */
    addMessage(role, content) {
        if (!content) return;
        this.history.push({ role, content });
        this.save();
    },

    /**
     * Check and initialize the system prompt if the conversation is empty.
     * @returns {boolean} - True if a new conversation was started (requires AI greeting), False otherwise.
     */
    ensureSystemPrompt() {
        // If history is not empty, we assume the conversation is ongoing
        if (this.history.length > 0) {
            return false;
        }

        const storedPrompt = localStorage.getItem(this.SYSTEM_PROMPT_KEY);
        
        if (storedPrompt) {
            console.log('[ConversationState] Found custom system prompt.');
            this.addMessage('system', storedPrompt);
        } else {
            console.log('[ConversationState] No custom prompt found, using default.');
            // Strict Protocol #6: English Only
            this.addMessage('system', 'You are a professional AI Interviewer. Maintain a professional, friendly demeanor. Ask follow-up questions based on the candidate\'s responses.');
        }
        
        // If we just added a system prompt (and history was empty), we should trigger the AI to start
        return true;
    },

    /**
     * Save current state to localStorage
     */
    save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.history));
        } catch (e) {
            console.error('[ConversationState] Error saving history:', e);
        }
    },

    /**
     * Clear the conversation history
     */
    clear() {
        this.history = [];
        localStorage.removeItem(this.STORAGE_KEY);
        console.log('[ConversationState] History cleared.');
    }
};

// Auto-initialize when loaded
ConversationState.init();

// Expose to window
window.ConversationState = ConversationState;
