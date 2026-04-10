"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalBridge = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
class InternalBridge {
    constructor(url, anonKey, callbacks) {
        this.channels = [];
        this.supabase = (0, supabase_js_1.createClient)(url, anonKey);
        this.callbacks = callbacks;
    }
    /** Fetch recent digest entries */
    async fetchRecentDigest(limit = 30) {
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
    subscribe() {
        const digestChannel = this.supabase
            .channel('internal_digest_inserts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'us_bridge_digest' }, (payload) => {
            console.log('[InternalBridge] New digest entry:', payload.new?.summary);
            this.callbacks.onDigestEntry(payload.new);
        })
            .subscribe((status) => {
            console.log('[InternalBridge] us_bridge_digest subscription:', status);
        });
        this.channels.push(digestChannel);
    }
    /** Clean up subscriptions */
    async dispose() {
        for (const channel of this.channels) {
            await this.supabase.removeChannel(channel);
        }
        this.channels = [];
        console.log('[InternalBridge] All channels removed');
    }
}
exports.InternalBridge = InternalBridge;
//# sourceMappingURL=InternalBridge.js.map