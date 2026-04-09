"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseBridge = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
class SupabaseBridge {
    constructor(url, anonKey, callbacks) {
        this.channels = [];
        this.supabase = (0, supabase_js_1.createClient)(url, anonKey);
        this.callbacks = callbacks;
    }
    /** Fetch all existing agents from us_registry */
    async fetchAgents() {
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
    async fetchSessions() {
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
    async fetchRecentMessages(limit = 20) {
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
    subscribe() {
        // Subscribe to new messages
        const msgChannel = this.supabase
            .channel('us_messages_inserts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'us_messages' }, (payload) => {
            console.log('[SupabaseBridge] New message:', payload.new);
            this.callbacks.onMessage(payload.new);
        })
            .subscribe((status) => {
            console.log('[SupabaseBridge] us_messages subscription:', status);
        });
        this.channels.push(msgChannel);
        // Subscribe to registry changes (new agents + updates)
        const regChannel = this.supabase
            .channel('us_registry_changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'us_registry' }, (payload) => {
            console.log('[SupabaseBridge] New agent registered:', payload.new);
            this.callbacks.onAgentRegistered(payload.new);
        })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'us_registry' }, (payload) => {
            console.log('[SupabaseBridge] Agent updated:', payload.new);
            this.callbacks.onAgentUpdated(payload.new);
        })
            .subscribe((status) => {
            console.log('[SupabaseBridge] us_registry subscription:', status);
        });
        this.channels.push(regChannel);
        // Subscribe to session changes
        const sessChannel = this.supabase
            .channel('us_sessions_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'us_sessions' }, (payload) => {
            console.log('[SupabaseBridge] Session change:', payload.new);
            this.callbacks.onSessionChange(payload.new);
        })
            .subscribe((status) => {
            console.log('[SupabaseBridge] us_sessions subscription:', status);
        });
        this.channels.push(sessChannel);
    }
    /** Clean up subscriptions */
    async dispose() {
        for (const channel of this.channels) {
            await this.supabase.removeChannel(channel);
        }
        this.channels = [];
        console.log('[SupabaseBridge] All channels removed');
    }
}
exports.SupabaseBridge = SupabaseBridge;
//# sourceMappingURL=SupabaseBridge.js.map