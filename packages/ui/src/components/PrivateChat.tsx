import React, { useState, useEffect, useRef } from 'react';
import { eventBus } from '../events';

const SUPABASE_URL = 'https://mitfencehbiyvyghdkpt.supabase.co';
const SUPABASE_ANON = [
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pdGZlbmNlaGJpeXZ5Z2hka3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzExNTIsImV4cCI6MjA4Njk0NzE1Mn0',
    'TYPcCeo6jCo_7sU8YFeY56iGC1UoOYO2kmth0HRf9ys'
].join('.');

interface FocusedAgent {
    name: string;
    id: string;
}

export function PrivateChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [agent, setAgent] = useState<FocusedAgent | null>(null);
    const [lastMessage, setLastMessage] = useState('');
    const [lastReply, setLastReply] = useState('');
    const [input, setInput] = useState('');
    const [orgId, setOrgId] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const wsRef = useRef<WebSocket | null>(null);

    // Listen for agent double-click
    useEffect(() => {
        const handleOpen = (e: any) => {
            const detail = e.detail;
            if (detail) {
                setAgent(detail);
                setIsOpen(true);
                setLastMessage('');
                setLastReply('');
                lookupOrg(detail.id);
                setTimeout(() => inputRef.current?.focus(), 100);
            }
        };
        eventBus.addEventListener('open-private-chat', handleOpen);
        return () => eventBus.removeEventListener('open-private-chat', handleOpen);
    }, []);

    async function lookupOrg(certId: string) {
        try {
            const res = await fetch(
                `${SUPABASE_URL}/rest/v1/us_orgs?agent_cert_ids=cs.{${certId}}&select=org_id&limit=1`,
                { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` } }
            );
            const orgs = await res.json();
            if (orgs.length > 0) {
                setOrgId(orgs[0].org_id);
                subscribeToReplies(orgs[0].org_id, certId);
            }
        } catch { /* ignore */ }
    }

    function subscribeToReplies(oid: string, certId: string) {
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
                    const record = msg.payload?.record;
                    if (record && record.sender === certId) {
                        setLastReply(record.message);
                    }
                }
            } catch { /* ignore */ }
        };

        const hb = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN)
                ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(++ref) }));
        }, 30000);
        ws.onclose = () => clearInterval(hb);
    }

    async function send() {
        if (!input.trim() || !orgId || !agent) return;
        const text = input.trim();
        setInput('');
        setLastMessage(text);
        setLastReply('');

        try {
            await fetch(`${SUPABASE_URL}/rest/v1/us_org_messages`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON,
                    'Authorization': `Bearer ${SUPABASE_ANON}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    org_id: orgId,
                    sender: 'owner',
                    message: text,
                    message_type: 'text',
                    target: agent.id,
                })
            });
        } catch { /* ignore */ }
    }

    function close() {
        setIsOpen(false);
        if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    }

    if (!isOpen || !agent) return null;

    return (
        <div style={{
            position: 'absolute',
            bottom: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 320,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            border: '2px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            padding: 0,
            zIndex: 40,
            fontFamily: 'monospace',
            backdropFilter: 'blur(4px)',
            imageRendering: 'pixelated' as any,
        }}>
            {/* Dialog header — like RPG name plate */}
            <div style={{
                padding: '6px 12px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <span style={{
                    color: '#fbbf24',
                    fontSize: 12,
                    fontWeight: 'bold',
                    letterSpacing: 1,
                }}>
                    {agent.name.toUpperCase()}
                </span>
                <span
                    onClick={close}
                    style={{ color: '#5a6478', cursor: 'pointer', fontSize: 11 }}
                >
                    [X]
                </span>
            </div>

            {/* Dialog body — shows last exchange */}
            <div style={{
                padding: '8px 12px',
                minHeight: 48,
                maxHeight: 80,
                overflow: 'hidden',
            }}>
                {lastMessage && (
                    <p style={{ margin: '0 0 4px', color: '#93c5fd', fontSize: 12, lineHeight: 1.4 }}>
                        You: {lastMessage}
                    </p>
                )}
                {lastReply && (
                    <p style={{ margin: 0, color: '#e2e8f0', fontSize: 12, lineHeight: 1.4 }}>
                        {agent.name}: {lastReply}
                    </p>
                )}
                {!lastMessage && !lastReply && (
                    <p style={{ margin: 0, color: '#5a6478', fontSize: 11 }}>
                        ...
                    </p>
                )}
            </div>

            {/* Input — simple RPG-style */}
            <div style={{
                padding: '6px 10px',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                gap: 6,
            }}>
                <span style={{ color: '#fbbf24', fontSize: 12, lineHeight: '28px' }}>&gt;</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') send();
                        if (e.key === 'Escape') close();
                    }}
                    placeholder="Say something..."
                    style={{
                        flex: 1,
                        padding: '4px 8px',
                        backgroundColor: 'transparent',
                        color: 'white',
                        border: 'none',
                        outline: 'none',
                        fontSize: 12,
                        fontFamily: 'monospace',
                    }}
                />
            </div>
        </div>
    );
}
