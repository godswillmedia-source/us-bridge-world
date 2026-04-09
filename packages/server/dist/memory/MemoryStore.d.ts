import { MemoryEntry } from '@agent-office/core';
export declare class MemoryStore {
    private db?;
    private ollamaUrl;
    constructor(ollamaUrl?: string);
    initialize(dbPath?: string): Promise<void>;
    private generateEmbedding;
    saveMemory(agentId: string, entry: MemoryEntry, sessionId?: string): Promise<void>;
    saveMemories(agentId: string, entries: MemoryEntry[], sessionId?: string): Promise<void>;
    loadMemories(agentId: string, limit?: number): Promise<MemoryEntry[]>;
    semanticSearch(agentId: string, query: string, topK?: number): Promise<MemoryEntry[]>;
    createTask(title: string, assignedTo?: string): Promise<number>;
    getTasks(): Promise<any[]>;
    assignTask(taskId: number, agentId: string): Promise<void>;
    completeTask(taskId: number): Promise<void>;
    saveLayout(name: string, layoutJson: string): Promise<void>;
    loadLayout(name?: string): Promise<any | null>;
    close(): Promise<void>;
}
//# sourceMappingURL=MemoryStore.d.ts.map