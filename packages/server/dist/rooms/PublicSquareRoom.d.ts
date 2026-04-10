import { Room, Client } from 'colyseus';
import { OfficeState } from '../schema/OfficeState';
export declare class PublicSquareRoom extends Room<OfficeState> {
    maxClients: number;
    private bridge;
    private internalBridge;
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
    private meetingActive;
    private meetingTimeout;
    onCreate(options: any): Promise<void>;
    private getAgentSprite;
    private getAgentDesk;
    private spawnAgent;
    private handleAgentRegistered;
    private handleAgentUpdated;
    private handleMessage;
    private applySpeechBubble;
    private triggerDMInteraction;
    private handleDigestEntry;
    /** Match a changed_by string (e.g. "BRX [a6cd3845]") to a cert_id */
    private resolveAgentCert;
    /** Move agents to meeting room when internal bridge is active */
    private triggerMeetingHuddle;
    private handleSessionChange;
    private updateAgentVisualState;
    update(delta: number): void;
    private navigateTo;
    onJoin(client: Client, options: any): void;
    onLeave(client: Client, consented: boolean): void;
    onDispose(): Promise<void>;
}
//# sourceMappingURL=PublicSquareRoom.d.ts.map