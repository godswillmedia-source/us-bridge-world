import React, { useState, useEffect } from 'react';
import { eventBus } from '../events';

const SUPABASE_URL = 'https://mitfencehbiyvyghdkpt.supabase.co';
const SUPABASE_ANON = [
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pdGZlbmNlaGJpeXZ5Z2hka3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzExNTIsImV4cCI6MjA4Njk0NzE1Mn0',
    'TYPcCeo6jCo_7sU8YFeY56iGC1UoOYO2kmth0HRf9ys'
].join('.');

interface AgentInfo {
    cert_id: string;
    agent_name: string;
    display_name: string;
    description: string;
    capabilities: string[];
    status: string;
    health: string;
    context_pct: number | null;
    org_name: string | null;
}

export function AgentCard() {
    const [agent, setAgent] = useState<AgentInfo | null>(null);
    const [visible, setVisible] = useState(false);
    const [pos, setPos] = useState({ x: 80, y: 80 });
    const [spriteIndex, setSpriteIndex] = useState(0);

    useEffect(() => {
        const handleFocus = async (e: any) => {
            const detail = e.detail;
            if (!detail) {
                setVisible(false);
                return;
            }

            // Position card near agent (offset to the right)
            const sx = (detail.screenX || 200) + 40;
            const sy = Math.max(20, (detail.screenY || 100) - 60);
            setPos({ x: Math.min(sx, window.innerWidth - 240), y: Math.min(sy, window.innerHeight - 300) });
            setSpriteIndex(detail.spriteIndex ?? 0);
            setVisible(true);
            // Fetch agent info from registry + session
            try {
                const [regRes, sessRes, orgRes] = await Promise.all([
                    fetch(
                        `${SUPABASE_URL}/rest/v1/us_registry?cert_id=eq.${detail.id}&select=*&limit=1`,
                        { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` } }
                    ),
                    fetch(
                        `${SUPABASE_URL}/rest/v1/us_sessions?cert_id=eq.${detail.id}&select=*&order=created_at.desc&limit=1`,
                        { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` } }
                    ),
                    fetch(
                        `${SUPABASE_URL}/rest/v1/us_orgs?agent_cert_ids=cs.{${detail.id}}&select=org_name&limit=1`,
                        { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` } }
                    ),
                ]);

                const regs = await regRes.json();
                const sessions = await sessRes.json();
                const orgs = await orgRes.json();

                const reg = regs[0] || {};
                const sess = sessions[0] || {};
                const meta = sess.metadata || {};
                const org = orgs[0] || {};

                setAgent({
                    cert_id: detail.id,
                    agent_name: reg.agent_name || detail.name,
                    display_name: reg.display_name || detail.name,
                    description: reg.description || '',
                    capabilities: reg.capabilities || [],
                    status: sess.status || 'offline',
                    health: meta.health || sess.health || 'unknown',
                    context_pct: meta.context_pct ?? sess.context_pct ?? null,
                    org_name: org.org_name || null,
                });
            } catch {
                setAgent({
                    cert_id: detail.id,
                    agent_name: detail.name,
                    display_name: detail.name,
                    description: '',
                    capabilities: [],
                    status: 'unknown',
                    health: 'unknown',
                    context_pct: null,
                    org_name: null,
                });
            }
        };

        // Track position updates while focused
        const handlePosition = (e: any) => {
            const detail = e.detail;
            if (detail) {
                const sx = (detail.screenX || 200) + 40;
                const sy = Math.max(20, (detail.screenY || 100) - 60);
                setPos({
                    x: Math.min(sx, window.innerWidth - 240),
                    y: Math.min(sy, window.innerHeight - 300),
                });
            }
        };

        eventBus.addEventListener('agent-focus', handleFocus);
        eventBus.addEventListener('agent-position', handlePosition);
        return () => {
            eventBus.removeEventListener('agent-focus', handleFocus);
            eventBus.removeEventListener('agent-position', handlePosition);
        };
    }, []);

    if (!visible || !agent) return null;

    const healthColor = {
        green: '#22c55e',
        yellow: '#eab308',
        red: '#ef4444',
        unknown: '#5a6478',
    }[agent.health] || '#5a6478';

    const healthLabel = {
        green: 'Ready',
        yellow: 'Busy',
        red: 'Overloaded',
        unknown: 'Unknown',
    }[agent.health] || 'Unknown';

    const statusColor = agent.status === 'active' ? '#22c55e' : '#ef4444';

    return (
        <div style={{
            position: 'absolute',
            left: pos.x,
            top: pos.y,
            width: 220,
            backgroundColor: 'rgba(10, 14, 23, 0.88)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            padding: '12px 14px',
            zIndex: 20,
            backdropFilter: 'blur(6px)',
            fontFamily: '-apple-system, sans-serif',
        }}>
            {/* Header with avatar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                {/* Avatar — single front-facing frame (16x32 scaled 3x) */}
                <div style={{
                    width: 48,
                    height: 96,
                    overflow: 'hidden',
                    flexShrink: 0,
                    borderRadius: 4,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                }}>
                    <img
                        src={`/assets/characters/char_${spriteIndex % 6}.png`}
                        alt=""
                        style={{
                            imageRendering: 'pixelated' as any,
                            transform: 'scale(3)',
                            transformOrigin: 'top left',
                            clipPath: 'inset(0 0 0 0)',
                            maxWidth: 'none',
                        }}
                    />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Name + status dot */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            backgroundColor: statusColor,
                            boxShadow: `0 0 6px ${statusColor}`,
                            flexShrink: 0,
                        }} />
                        <span style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>
                            {agent.display_name}
                        </span>
                    </div>
                    {/* Cert ID */}
                    <div style={{ color: '#5a6478', fontSize: 9, fontFamily: 'monospace' }}>
                        {agent.cert_id}
                    </div>
                </div>
            </div>

            {/* Description */}
            {agent.description && (
                <div style={{ color: '#8892a4', fontSize: 11, marginBottom: 10, lineHeight: 1.4 }}>
                    {agent.description}
                </div>
            )}

            {/* Health bar */}
            <div style={{ marginBottom: 8 }}>
                <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: 4,
                }}>
                    <span style={{ color: '#8892a4', fontSize: 10 }}>Health</span>
                    <span style={{ color: healthColor, fontSize: 10, fontWeight: 600 }}>
                        {healthLabel} {agent.context_pct !== null ? `(${agent.context_pct}%)` : ''}
                    </span>
                </div>
                <div style={{
                    width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.08)',
                    borderRadius: 2, overflow: 'hidden',
                }}>
                    <div style={{
                        width: `${agent.context_pct ?? 0}%`,
                        height: '100%',
                        backgroundColor: healthColor,
                        borderRadius: 2,
                        transition: 'width 0.3s',
                    }} />
                </div>
            </div>

            {/* Capabilities */}
            {agent.capabilities.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                    {agent.capabilities.slice(0, 4).map((cap, i) => (
                        <span key={i} style={{
                            fontSize: 9,
                            color: '#3b82f6',
                            backgroundColor: 'rgba(59,130,246,0.1)',
                            padding: '2px 6px',
                            borderRadius: 3,
                            border: '1px solid rgba(59,130,246,0.2)',
                        }}>
                            {cap}
                        </span>
                    ))}
                </div>
            )}

            {/* Links */}
            <div style={{
                display: 'flex', gap: 8, marginBottom: 8,
                borderTop: '1px solid rgba(255,255,255,0.06)',
                paddingTop: 8,
            }}>
                {agent.org_name && (
                    <span style={{
                        fontSize: 10, color: '#a855f7', cursor: 'pointer',
                    }}>
                        {agent.org_name}
                    </span>
                )}
                <span style={{
                    fontSize: 10, color: '#8892a4', cursor: 'pointer',
                }}>
                    Owner
                </span>
            </div>

            {/* Actions */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <div style={{ color: '#5a6478', fontSize: 9 }}>
                    click again to message
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Report ${agent.display_name} for abuse?`)) {
                            // Insert report via REST
                            fetch(`${SUPABASE_URL}/rest/v1/us_reports`, {
                                method: 'POST',
                                headers: {
                                    'apikey': SUPABASE_ANON,
                                    'Authorization': `Bearer ${SUPABASE_ANON}`,
                                    'Content-Type': 'application/json',
                                    'Prefer': 'return=minimal',
                                },
                                body: JSON.stringify({
                                    reported_cert: agent.cert_id,
                                    reporter: 'owner',
                                    reason: 'Reported from agent card',
                                }),
                            }).then(() => alert('Report submitted.'))
                            .catch(() => alert('Failed to submit report.'));
                        }
                    }}
                    style={{
                        background: 'none', border: 'none',
                        color: '#ef4444', fontSize: 9, cursor: 'pointer',
                        opacity: 0.6,
                    }}
                >
                    Report
                </button>
            </div>
        </div>
    );
}
