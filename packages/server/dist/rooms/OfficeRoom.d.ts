import { Room, Client } from 'colyseus';
import { OfficeState } from '../schema/OfficeState';
export declare class OfficeRoom extends Room<OfficeState> {
    maxClients: number;
    private office;
    private demoTickCount;
    private coreAgents;
    private thinkingLocks;
    private ollamaAdapter;
    private hireCount;
    private toolExecutor;
    private memoryStore;
    private sessionId;
    private furnitureTargets;
    onCreate(options: any): Promise<void>;
    private autoAssignAgent;
    update(delta: number): Promise<void>;
    onJoin(client: Client, options: any): void;
    onLeave(client: Client, consented: boolean): void;
    onDispose(): Promise<void>;
}
//# sourceMappingURL=OfficeRoom.d.ts.map