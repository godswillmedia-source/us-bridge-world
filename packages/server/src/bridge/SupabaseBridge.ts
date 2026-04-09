import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

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

export class SupabaseBridge {
    private supabase: SupabaseClient;
    private callbacks: BridgeCallbacks;
    private channels: RealtimeChannel[] = [];

    constructor(url: string, anonKey: string, callbacks: BridgeCallbacks) {
        this.supabase = createClient(url, anonKey);
        this.callbacks = callbacks;
    }

    /** Fetch all existing agents from us_registry */
    async fetchAgents(): Promise<BridgeAgent[]> {
        const { data, error } = await this.supabase
            .from('us_registry')
            .select('cert_id, agent_name, display_name, capabilities, avatar_url, description, status')
            .eq('status', 'active');

        if (error) {
            console.error('[SupabaseBridge] Failed to fetch registry:', error.message);
            return [];
        }
        return data || [];
    }

    /** Fetch existing sessions */
    async fetchSessions(): Promise<BridgeSession[]> {
        const { data, error } = await this.supabase
            .from('us_sessions')
            .select('session_id, cert_id, status, last_heartbeat, metadata');

        if (error) {
            console.error('[SupabaseBridge] Failed to fetch sessions:', error.message);
            return [];
        }
        return data || [];
    }

    /** Fetch recent messages */
    async fetchRecentMessages(limit: number = 20): Promise<BridgeMessage[]> {
        const { data, error } = await this.supabase
            .from('us_messages')
            .select('id, from_cert, target, message_type, payload, channel, created_at')
            .order('id', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[SupabaseBridge] Failed to fetch messages:', error.message);
            return [];
        }
        return (data || []).reverse();
    }

    /** Start Realtime subscriptions */
    subscribe(): void {
        // Subscribe to new messages
        const msgChannel = this.supabase
            .channel('us_messages_inserts')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'us_messages' },
                (payload) => {
                    console.log('[SupabaseBridge] New message:', payload.new);
                    this.callbacks.onMessage(payload.new as BridgeMessage);
                }
            )
            .subscribe((status) => {
                console.log('[SupabaseBridge] us_messages subscription:', status);
            });
        this.channels.push(msgChannel);

        // Subscribe to registry changes (new agents + updates)
        const regChannel = this.supabase
            .channel('us_registry_changes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'us_registry' },
                (payload) => {
                    console.log('[SupabaseBridge] New agent registered:', payload.new);
                    this.callbacks.onAgentRegistered(payload.new as BridgeAgent);
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'us_registry' },
                (payload) => {
                    console.log('[SupabaseBridge] Agent updated:', payload.new);
                    this.callbacks.onAgentUpdated(payload.new as BridgeAgent);
                }
            )
            .subscribe((status) => {
                console.log('[SupabaseBridge] us_registry subscription:', status);
            });
        this.channels.push(regChannel);

        // Subscribe to session changes
        const sessChannel = this.supabase
            .channel('us_sessions_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'us_sessions' },
                (payload) => {
                    console.log('[SupabaseBridge] Session change:', payload.new);
                    this.callbacks.onSessionChange(payload.new as BridgeSession);
                }
            )
            .subscribe((status) => {
                console.log('[SupabaseBridge] us_sessions subscription:', status);
            });
        this.channels.push(sessChannel);
    }

    /** Clean up subscriptions */
    async dispose(): Promise<void> {
        for (const channel of this.channels) {
            await this.supabase.removeChannel(channel);
        }
        this.channels = [];
        console.log('[SupabaseBridge] All channels removed');
    }
}
