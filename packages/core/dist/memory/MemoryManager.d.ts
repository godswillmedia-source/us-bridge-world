export interface Memory {
    id: string;
    agentId: string;
    type: 'conversation' | 'action' | 'achievement' | 'relationship';
    content: string;
    embedding?: number[];
    timestamp: Date;
    importance: number;
    associations: string[];
}
export declare class MemoryManager {
    private shortTerm;
    constructor();
    private generateId;
    add(memory: Omit<Memory, 'id'>): Promise<void>;
    recall(query: string, limit?: number): Promise<Memory[]>;
    recallRecent(limit: number): Promise<Memory[]>;
    consolidate(): Promise<void>;
}
//# sourceMappingURL=MemoryManager.d.ts.map