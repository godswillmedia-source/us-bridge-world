import { InferenceAdapter, CompletionRequest, CompletionResponse } from '@agent-office/core';
export declare class OpenAICompatibleAdapter implements InferenceAdapter {
    private baseUrl;
    private apiKey;
    readonly provider: string;
    readonly isLocal = false;
    constructor(baseUrl: string, apiKey: string, provider?: string);
    complete(request: CompletionRequest): Promise<CompletionResponse>;
}
//# sourceMappingURL=OpenAICompatibleAdapter.d.ts.map