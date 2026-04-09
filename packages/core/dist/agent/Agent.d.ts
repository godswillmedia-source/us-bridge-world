import { AgentConfig } from './AgentConfig';
import { InferenceAdapter } from './InferenceAdapter';
export type AgentStateStatus = 'IDLE' | 'PERCEIVING' | 'THINKING' | 'ACTING' | 'COMMUNICATING';
export interface Perception {
    time: string;
    location: string;
    nearbyAgents: {
        name: string;
        role: string;
        distance: number;
    }[];
    currentTask: any | null;
    recentMessages: ConversationMessage[];
    memories: string[];
}
export interface Decision {
    thought: string;
    action: 'move' | 'talk' | 'work' | 'use_tool' | 'idle';
    target?: string;
    message?: string;
    toolCall?: {
        name: string;
        params: any;
    };
}
export interface ActionResult {
    success: boolean;
    result?: any;
    error?: string;
}
export interface Event {
    type: string;
    data: any;
    timestamp: Date;
}
export interface Message {
    from: string;
    content: string;
}
export interface ConversationMessage {
    from: string;
    to: string;
    content: string;
    timestamp: string;
}
export interface MemoryEntry {
    content: string;
    type: 'thought' | 'conversation' | 'task_result' | 'observation' | 'achievement' | 'relationship';
    timestamp: string;
    importance: number;
}
export declare class Agent {
    config: AgentConfig;
    private status;
    private adapter?;
    inbox: ConversationMessage[];
    memories: MemoryEntry[];
    currentTask: string;
    constructor(config: AgentConfig);
    setInferenceAdapter(adapter: InferenceAdapter): void;
    initialize(): Promise<void>;
    receiveMessage(msg: ConversationMessage): void;
    getUnreadMessages(): ConversationMessage[];
    clearInbox(): void;
    addMemory(entry: MemoryEntry): void;
    getRecentMemories(count?: number): string[];
    loadMemories(entries: MemoryEntry[]): void;
    think(perception: Perception): Promise<Decision>;
    act(decision: Decision): Promise<ActionResult>;
    remember(event: Event): Promise<void>;
    communicate(message: Message): Promise<void>;
}
//# sourceMappingURL=Agent.d.ts.map