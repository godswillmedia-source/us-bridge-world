"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaAdapter = void 0;
class OllamaAdapter {
    constructor(baseUrl = 'http://localhost:11434') {
        this.baseUrl = baseUrl;
        this.provider = 'ollama';
        this.isLocal = true;
    }
    async complete(request) {
        const start = Date.now();
        const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: request.model,
                messages: request.messages,
                stream: false,
                tools: request.tools,
                options: { temperature: request.temperature }
            })
        });
        if (!response.ok) {
            throw new Error(`Ollama Error: ${response.statusText}`);
        }
        const data = await response.json();
        const latency = Date.now() - start;
        let toolCalls;
        if (data.message.tool_calls) {
            toolCalls = data.message.tool_calls.map((tc) => ({
                name: tc.function.name,
                params: tc.function.arguments
            }));
        }
        return {
            content: data.message.content || '',
            toolCalls,
            usage: {
                prompt: data.prompt_eval_count || 0,
                completion: data.eval_count || 0
            },
            latency
        };
    }
    async *stream(request) {
        const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...request, stream: true })
        });
        if (!response.body)
            throw new Error("No response body for stream.");
        // Simple stream decoder for node/browser
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            const chunk = decoder.decode(value);
            for (const line of chunk.split('\n')) {
                if (!line.trim())
                    continue;
                const parsed = JSON.parse(line);
                if (parsed.message?.content) {
                    yield parsed.message.content;
                }
            }
        }
    }
}
exports.OllamaAdapter = OllamaAdapter;
//# sourceMappingURL=OllamaAdapter.js.map