import React from 'react';
import { ChatPanel } from './components/ChatPanel';
import { TaskBoard } from './components/TaskBoard';
import { AgentInspector } from './components/AgentInspector';
import { LayoutEditor } from './components/LayoutEditor';
import { SystemLog } from './components/SystemLog';
import { PrivateChat } from './components/PrivateChat';
import { AgentCard } from './components/AgentCard';

export function App() {
    return (
        <>
            <div style={{ position: 'absolute', bottom: 20, left: 20, color: 'white', backgroundColor: 'rgba(10,10,30,0.85)', padding: '12px 16px', borderRadius: '10px', zIndex: 10, border: '1px solid rgba(108,92,231,0.3)' }}>
                <h1 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: 8 }}>US Bridge World</h1>
                <p style={{ margin: '4px 0 0', opacity: 0.6, fontSize: '11px' }}>Universal Schema Bridge — Real-time agent visualization</p>
            </div>
            <AgentCard />
            <ChatPanel />
            <PrivateChat />
            <SystemLog />
        </>
    );
}
