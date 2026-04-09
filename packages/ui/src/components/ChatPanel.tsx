import React, { useState, useEffect, useRef } from 'react';
import { eventBus } from '../events';
import { getColyseusRoom } from '../game/Game';

const SUPABASE_URL = 'https://mitfencehbiyvyghdkpt.supabase.co';
const SUPABASE_ANON = [
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pdGZlbmNlaGJpeXZ5Z2hka3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzExNTIsImV4cCI6MjA4Njk0NzE1Mn0',
    'TYPcCeo6jCo_7sU8YFeY56iGC1UoOYO2kmth0HRf9ys'
].join('.');

interface OrgMessage {
    id: string;
    sender: string;
    message: string;
    message_type: string;
    target: string | null;
    created_at: string;
}

interface ChatMessage {
    sender: string;
    text: string;
    source: 'public' | 'org' | 'system';
    target?: string | null;
    time?: string;
}

export function ChatPanel() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { sender: 'System', text: 'Bridge connected.', source: 'system' }
    ]);
    const [input, setInput] = useState('');
    const [filter, setFilter] = useState<string | null>(null); // null = all, cert_id = private
    const [orgId, setOrgId] = useState<string | null>(null);
    const [orgAgents, setOrgAgents] = useState<string[]>([]);
    const endRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);

    // Load org info on mount
    useEffect(() => {
        loadOrg();
    }, []);

    // Listen for public chat messages from Colyseus
    useEffect(() => {
        const handleChat = (e: any) => {
            const detail = e.detail;
            setMessages(prev => [...prev, {
                sender: detail.sender,
                text: detail.text,
                source: 'public' as const,
            }]);
        };
        eventBus.addEventListener('chat-message', handleChat);
        return () => eventBus.removeEventListener('chat-message', handleChat);
    }, []);

    // Listen for agent focus — clicking agent filters to private chat
    useEffect(() => {
        const handleFocus = (e: any) => {
            const detail = e.detail;
            if (detail) {
                setFilter(detail.id);
            }
        };
        const handleOpenPrivate = (e: any) => {
            const detail = e.detail;
            if (detail) {
                setFilter(detail.id);
            }
        };
        eventBus.addEventListener('agent-focus', handleFocus);
        eventBus.addEventListener('open-private-chat', handleOpenPrivate);
        return () => {
            eventBus.removeEventListener('agent-focus', handleFocus);
            eventBus.removeEventListener('open-private-chat', handleOpenPrivate);
        };
    }, []);

    // Auto-scroll
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function loadOrg() {
        try {
            // Load all orgs and find ours (owner view)
            const res = await fetch(
                `${SUPABASE_URL}/rest/v1/us_orgs?select=*&limit=10`,
                { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` } }
            );
            const orgs = await res.json();
            if (orgs.length > 0) {
                const org = orgs[0]; // Default to first org
                setOrgId(org.org_id);
                setOrgAgents(org.agent_cert_ids || []);

                // Load message history
                const msgRes = await fetch(
                    `${SUPABASE_URL}/rest/v1/us_org_messages?org_id=eq.${org.org_id}&order=created_at.asc&limit=100`,
                    { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` } }
                );
                const msgs: OrgMessage[] = await msgRes.json();
                const chatMsgs: ChatMessage[] = msgs.map(m => ({
                    sender: m.sender,
                    text: m.message,
                    source: 'org' as const,
                    target: m.target,
                    time: m.created_at,
                }));
                setMessages(prev => [...prev, ...chatMsgs]);

                // Subscribe to realtime
                subscribeToOrg(org.org_id);
            }
        } catch (err) {
            console.error('Failed to load org:', err);
        }
    }

    function subscribeToOrg(oid: string) {
        if (wsRef.current) wsRef.current.close();

        const wsUrl = SUPABASE_URL.replace('https://', 'wss://') +
            `/realtime/v1/websocket?apikey=${SUPABASE_ANON}&vsn=1.0.0`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        let ref = 0;

        ws.onopen = () => {
            ws.send(JSON.stringify({
                topic: `realtime:public:us_org_messages:org_id=eq.${oid}`,
                event: 'phx_join',
                payload: {},
                ref: String(++ref)
            }));
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.event === 'INSERT') {
                    const record = msg.payload?.record as OrgMessage;
                    if (record && record.org_id === oid) {
                        setMessages(prev => [...prev, {
                            sender: record.sender,
                            text: record.message,
                            source: 'org' as const,
                            target: record.target,
                            time: record.created_at,
                        }]);
                    }
                }
            } catch { /* ignore */ }
        };

        const heartbeat = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(++ref) }));
            }
        }, 30000);
        ws.onclose = () => clearInterval(heartbeat);
    }

    async function sendMessage() {
        if (!input.trim() || !orgId) return;
        const text = input.trim();
        setInput('');

        try {
            const data: any = {
                org_id: orgId,
                sender: 'owner',
                message: text,
                message_type: 'text',
            };
            if (filter) {
                data.target = filter;
            }

            await fetch(`${SUPABASE_URL}/rest/v1/us_org_messages`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON,
                    'Authorization': `Bearer ${SUPABASE_ANON}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(data)
            });
        } catch (err) {
            console.error('Failed to send:', err);
        }
    }

    // Filter messages based on current filter
    const filteredMessages = messages.filter(m => {
        if (!filter) return true; // Show all
        if (m.source === 'system') return true;
        if (m.source === 'public') return false; // Hide public when filtered
        // Show messages between owner and filtered agent
        if (m.sender === filter || m.target === filter) return true;
        if (m.sender === 'owner' && (m.target === filter || !m.target)) return true;
        return false;
    });

    function formatTime(ts?: string) {
        if (!ts) return '';
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function getAgentName(certId: string) {
        if (certId === 'owner') return 'You';
        const parts = certId.split('-');
        return parts.length >= 3 ? parts.slice(2).join('-').toUpperCase() : certId;
    }

    return (
        <div style={{
            position: 'absolute', right: 20, bottom: 20, width: 320, height: 450,
            backgroundColor: 'rgba(10,14,23,0.92)', color: 'white', borderRadius: 12,
            display: 'flex', flexDirection: 'column',
            border: '1px solid rgba(59,130,246,0.2)',
            backdropFilter: 'blur(8px)',
            zIndex: 15,
        }}>
            {/* Header */}
            <div style={{
                padding: '10px 14px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                        {filter ? `Private: ${getAgentName(filter)}` : 'Office Chat'}
                    </span>
                    {filter && (
                        <div style={{
                            width: 6, height: 6, borderRadius: '50%',
                            backgroundColor: '#22c55e',
                        }} />
                    )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    {filter && (
                        <button
                            onClick={() => setFilter(null)}
                            style={{
                                background: 'rgba(255,255,255,0.1)', border: 'none',
                                color: '#8892a4', cursor: 'pointer', fontSize: 11,
                                padding: '2px 8px', borderRadius: 4,
                            }}
                        >
                            All
                        </button>
                    )}
                    {/* Agent filter buttons */}
                    {orgAgents.slice(0, 4).map(cert => (
                        <button
                            key={cert}
                            onClick={() => setFilter(filter === cert ? null : cert)}
                            style={{
                                background: filter === cert ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.05)',
                                border: filter === cert ? '1px solid rgba(59,130,246,0.5)' : '1px solid transparent',
                                color: filter === cert ? '#3b82f6' : '#5a6478',
                                cursor: 'pointer', fontSize: 9,
                                padding: '2px 6px', borderRadius: 4,
                            }}
                        >
                            {getAgentName(cert)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Messages */}
            <div style={{
                flex: 1, overflowY: 'auto', fontSize: 13, padding: '8px 12px',
                display: 'flex', flexDirection: 'column', gap: 4,
            }}>
                {filteredMessages.map((m, i) => {
                    const isOwner = m.sender === 'owner';
                    const isSystem = m.source === 'system';
                    const isPrivate = m.target && m.target !== 'org';

                    if (isSystem) {
                        return (
                            <p key={i} style={{ margin: '4px 0', color: '#06b6d4', fontSize: 11, textAlign: 'center' }}>
                                {m.text}
                            </p>
                        );
                    }

                    return (
                        <div key={i} style={{
                            display: 'flex',
                            justifyContent: isOwner ? 'flex-end' : 'flex-start',
                            margin: '2px 0',
                        }}>
                            <div style={{
                                maxWidth: '80%',
                                padding: '6px 10px',
                                borderRadius: isOwner ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                                backgroundColor: isOwner ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)',
                                fontSize: 12,
                                lineHeight: 1.4,
                            }}>
                                {!isOwner && (
                                    <div style={{
                                        fontSize: 10, color: '#3b82f6', marginBottom: 2,
                                        display: 'flex', alignItems: 'center', gap: 4,
                                    }}>
                                        {getAgentName(m.sender)}
                                        {isPrivate && (
                                            <span style={{ color: '#a855f7', fontSize: 9 }}>private</span>
                                        )}
                                    </div>
                                )}
                                {m.text}
                                {m.time && (
                                    <div style={{ fontSize: 9, color: '#5a6478', marginTop: 2, textAlign: 'right' }}>
                                        {formatTime(m.time)}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={endRef} />
            </div>

            {/* Input */}
            <div style={{
                padding: '8px 10px',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', gap: 6,
            }}>
                <input
                    type="text"
                    placeholder={filter ? `Private to ${getAgentName(filter)}...` : 'Message all agents...'}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    style={{
                        flex: 1, padding: '8px 12px', background: '#1a2233',
                        color: 'white', border: '1px solid #2a3548', borderRadius: 16,
                        outline: 'none', fontSize: 12,
                    }}
                />
                <button
                    onClick={sendMessage}
                    style={{
                        width: 32, height: 32, borderRadius: '50%',
                        backgroundColor: input.trim() ? '#3b82f6' : '#2a3548',
                        color: 'white', border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                        fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }}
                >
                    ^
                </button>
            </div>
        </div>
    );
}
