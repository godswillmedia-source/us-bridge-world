"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAICompatibleAdapter = void 0;
class OpenAICompatibleAdapter {
    constructor(baseUrl, apiKey, provider = 'openai') {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.provider = provider;
        this.isLocal = false;
    }
    async complete(request) {
        const start = Date.now();
        // Map tools if required
        const tools = request.tools ? request.tools.map(t => ({
            type: "function",
            function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters
            }
        })) : undefined;
        const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: request.model,
                messages: request.messages,
                tools,
                temperature: request.temperature
            })
        });
        if (!response.ok) {
            throw new Error(`OpenAI Error: ${response.statusText}`);
        }
        const data = await response.json();
        const latency = Date.now() - start;
        const message = data.choices[0].message;
        let toolCalls;
        if (message.tool_calls) {
            toolCalls = message.tool_calls.map((tc) => ({
                name: tc.function.name,
                params: JSON.parse(tc.function.arguments)
            }));
        }
        return {
            content: message.content || '',
            toolCalls,
            usage: {
                prompt: data.usage?.prompt_tokens || 0,
                completion: data.usage?.completion_tokens || 0
            },
            latency
        };
    }
}
exports.OpenAICompatibleAdapter = OpenAICompatibleAdapter;
//# sourceMappingURL=OpenAICompatibleAdapter.js.map