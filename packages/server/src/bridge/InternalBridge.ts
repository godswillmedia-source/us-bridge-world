import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

/**
 * InternalBridge — connects to Will's PRIVATE Supabase project (vdbejzywxgqaebfedlyh).
 *
 * Reads from us_bridge_digest for internal team communications.
 * This is separate from the public bridge (mitfencehbiyvyghdkpt) which handles
 * us_messages, us_registry, and us_sessions for the public-facing pixel world.
 *
 * Outbound messages go through the US Gateway (signed envelopes).
 */

export interface DigestEntry {
    id: number;
    table_name: string;
    row_id: string;
    change_type: string;
    changed_by: string;
    summary: string;
    changed_fields: string[] | null;
    old_status: string | null;
    new_status: string | null;
    created_at: string;
}

export interface InternalBridgeCallbacks {
    onDigestEntry: (entry: DigestEntry) => void;
}

export class InternalBridge {
    private supabase: SupabaseClient;
    private callbacks: InternalBridgeCallbacks;
    private channels: RealtimeChannel[] = [];

    constructor(url: string, anonKey: string, callbacks: InternalBridgeCallbacks) {
        this.supabase = createClient(url, anonKey);
        this.callbacks = callbacks;
    }

    /** Fetch recent digest entries */
    async fetchRecentDigest(limit: number = 30): Promise<DigestEntry[]> {
        const { data, error } = await this.supabase
            .from('us_bridge_digest')
            .select('id, table_name, row_id, change_type, changed_by, summary, changed_fields, old_status, new_status, created_at')
            .order('id', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[InternalBridge] Failed to fetch digest:', error.message);
            return [];
        }
        return (data || []).reverse();
    }

    /** Start Realtime subscription on us_bridge_digest */
    subscribe(): void {
        const digestChannel = this.supabase
            .channel('internal_digest_inserts')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'us_bridge_digest' },
                (payload) => {
                    console.log('[InternalBridge] New digest entry:', payload.new?.summary);
                    this.callbacks.onDigestEntry(payload.new as DigestEntry);
                }
            )
            .subscribe((status) => {
                console.log('[InternalBridge] us_bridge_digest subscription:', status);
            });
        this.channels.push(digestChannel);
    }

    /** Clean up subscriptions */
    async dispose(): Promise<void> {
        for (const channel of this.channels) {
            await this.supabase.removeChannel(channel);
        }
        this.channels = [];
        console.log('[InternalBridge] All channels removed');
    }
}
