import { Room, Client } from 'colyseus';
import { OfficeState } from '../schema/OfficeState';
export declare class PublicSquareRoom extends Room<OfficeState> {
    maxClients: number;
    private bridge;
    private agentSpriteMap;
    private spriteCounter;
    private agentDeskMap;
    private deskCounter;
    private activeSessions;
    private walkTargets;
    private speechBubbles;
    private tickCount;
    private wanderTargets;
    private wanderCooldown;
    private grid;
    private agentPaths;
    onCreate(options: any): Promise<void>;
    private getAgentSprite;
    private getAgentDesk;
    private spawnAgent;
    private handleAgentRegistered;
    private handleAgentUpdated;
    private handleMessage;
    private applySpeechBubble;
    private triggerDMInteraction;
    private handleSessionChange;
    private updateAgentVisualState;
    update(delta: number): void;
    private navigateTo;
    onJoin(client: Client, options: any): void;
    onLeave(client: Client, consented: boolean): void;
    onDispose(): Promise<void>;
}
//# sourceMappingURL=PublicSquareRoom.d.ts.map