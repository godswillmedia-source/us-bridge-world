"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Agent = void 0;
class Agent {
    constructor(config) {
        this.status = 'IDLE';
        // Conversation inbox
        this.inbox = [];
        // Short-term memory buffer
        this.memories = [];
        // Current assigned task
        this.currentTask = '';
        this.config = config;
    }
    setInferenceAdapter(adapter) {
        this.adapter = adapter;
    }
    async initialize() {
        this.status = 'IDLE';
    }
    // --- Conversation System ---
    receiveMessage(msg) {
        this.inbox.push(msg);
        // Keep inbox at manageable size
        if (this.inbox.length > 20)
            this.inbox.shift();
    }
    getUnreadMessages() {
        return [...this.inbox];
    }
    clearInbox() {
        this.inbox = [];
    }
    // --- Memory System ---
    addMemory(entry) {
        this.memories.push(entry);
        // Trim low-importance memories when buffer exceeds limit
        const limit = this.config.memory.shortTermLimit || 50;
        if (this.memories.length > limit) {
            this.memories.sort((a, b) => b.importance - a.importance);
            this.memories = this.memories.slice(0, limit);
        }
    }
    getRecentMemories(count = 10) {
        return this.memories.slice(-count).map(m => `[${m.type}] ${m.content}`);
    }
    loadMemories(entries) {
        this.memories = entries;
    }
    // --- Core Think Cycle ---
    async think(perception) {
        this.status = 'THINKING';
        if (!this.adapter) {
            console.warn(`[Agent ${this.config.name}] No InferenceAdapter set, mocking thought...`);
            return { thought: "Waiting for inference adapter...", action: "idle" };
        }
        try {
            // Build rich context
            const nearbyStr = perception.nearbyAgents.length > 0
                ? `Nearby: ${perception.nearbyAgents.map(a => `${a.name} (${a.role})`).join(', ')}`
                : 'You are alone at your desk.';
            const messageStr = perception.recentMessages.length > 0
                ? `Recent messages:\n${perception.recentMessages.map(m => `  ${m.from}: "${m.content}"`).join('\n')}`
                : '';
            const memoryStr = perception.memories.length > 0
                ? `Your recent memories:\n${perception.memories.slice(-5).join('\n')}`
                : '';
            const taskStr = perception.currentTask
                ? `Your assigned task: ${JSON.stringify(perception.currentTask)}`
                : 'No task assigned yet.';
            const prompt = `You are ${this.config.name}, a ${this.config.role} in a virtual office.
Personality: ${this.config.personality.communicationStyle} style. Traits: ${JSON.stringify(this.config.personality.traits)}.
System: ${this.config.inference.systemPrompt}
Current Time: ${perception.time}
Location: ${perception.location}
${nearbyStr}
${taskStr}
${messageStr}
${memoryStr}

You must decide your next action. Reply ONLY with a JSON object:
{
  "thought": "your brief inner monologue (max 30 words)",
  "action": "work" | "talk" | "idle" | "use_tool",
  "target": "agent name if talking, or tool name if using tool",
  "message": "what you say if action is talk",
  "toolCall": { "name": "tool_name", "params": {} }
}

Rules:
- If someone sent you a message, you should respond with action "talk"
- Keep thoughts SHORT (under 30 words)
- If you have a task, work on it
- Be collaborative and social`;
            const res = await this.adapter.complete({
                model: this.config.inference.model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7
            });
            const match = res.content.match(/\{[\s\S]*\}/);
            const decisionStr = match ? match[0] : null;
            if (decisionStr) {
                const parsed = JSON.parse(decisionStr);
                const decision = {
                    thought: (parsed.thought || "Thinking...").slice(0, 120),
                    action: parsed.action || "idle",
                    target: parsed.target,
                    message: parsed.message,
                    toolCall: parsed.toolCall
                };
                // Auto-remember this thought
                this.addMemory({
                    content: decision.thought,
                    type: 'thought',
                    timestamp: perception.time,
                    importance: 0.3
                });
                return decision;
            }
        }
        catch (e) {
            console.error(`[Agent ${this.config.name}] Inference failed:`, e);
        }
        return { thought: "Systems recovering...", action: "idle" };
    }
    async act(decision) {
        this.status = 'ACTING';
        return { success: true };
    }
    async remember(event) {
        this.addMemory({
            content: `${event.type}: ${JSON.stringify(event.data)}`,
            type: 'observation',
            timestamp: event.timestamp.toISOString(),
            importance: 0.5
        });
    }
    async communicate(message) {
        this.status = 'COMMUNICATING';
        this.addMemory({
            content: `${message.from} said: "${message.content}"`,
            type: 'conversation',
            timestamp: new Date().toISOString(),
            importance: 0.7
        });
    }
}
exports.Agent = Agent;
//# sourceMappingURL=Agent.js.map