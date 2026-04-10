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
export declare class InternalBridge {
    private supabase;
    private callbacks;
    private channels;
    constructor(url: string, anonKey: string, callbacks: InternalBridgeCallbacks);
    /** Fetch recent digest entries */
    fetchRecentDigest(limit?: number): Promise<DigestEntry[]>;
    /** Start Realtime subscription on us_bridge_digest */
    subscribe(): void;
    /** Clean up subscriptions */
    dispose(): Promise<void>;
}
//# sourceMappingURL=InternalBridge.d.ts.map