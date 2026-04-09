/**
 * SupabaseBridge — connects to the US Bridge backend on Supabase.
 *
 * Subscribes to Realtime changes on:
 *   - us_registry  (agent registrations)
 *   - us_messages   (inter-agent messages)
 *   - us_sessions   (connect/disconnect events)
 *
 * Emits callbacks so the Colyseus room can update its state.
 */
export interface BridgeAgent {
    cert_id: string;
    agent_name: string;
    display_name: string;
    capabilities: string[];
    avatar_url: string | null;
    description: string;
    status: string;
}
export interface BridgeMessage {
    id: number;
    from_cert: string;
    target: string;
    message_type: string;
    payload: any;
    channel: string;
    created_at: string;
}
export interface BridgeSession {
    session_id: string;
    cert_id: string;
    status: string;
    last_heartbeat: string;
    metadata: any;
}
export interface BridgeCallbacks {
    onAgentRegistered: (agent: BridgeAgent) => void;
    onAgentUpdated: (agent: BridgeAgent) => void;
    onMessage: (message: BridgeMessage) => void;
    onSessionChange: (session: BridgeSession) => void;
}
export declare class SupabaseBridge {
    private supabase;
    private callbacks;
    private channels;
    constructor(url: string, anonKey: string, callbacks: BridgeCallbacks);
    /** Fetch all existing agents from us_registry */
    fetchAgents(): Promise<BridgeAgent[]>;
    /** Fetch existing sessions */
    fetchSessions(): Promise<BridgeSession[]>;
    /** Fetch recent messages */
    fetchRecentMessages(limit?: number): Promise<BridgeMessage[]>;
    /** Start Realtime subscriptions */
    subscribe(): void;
    /** Clean up subscriptions */
    dispose(): Promise<void>;
}
//# sourceMappingURL=SupabaseBridge.d.ts.map