import { InferenceAdapter, CompletionRequest, CompletionResponse } from '@agent-office/core';
export declare class OllamaAdapter implements InferenceAdapter {
    private baseUrl;
    readonly provider = "ollama";
    readonly isLocal = true;
    constructor(baseUrl?: string);
    complete(request: CompletionRequest): Promise<CompletionResponse>;
    stream(request: CompletionRequest): AsyncIterable<string>;
}
//# sourceMappingURL=OllamaAdapter.d.ts.map