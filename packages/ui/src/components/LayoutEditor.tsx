import React, { useState } from 'react';
import { getColyseusRoom } from '../game/Game';

interface FurnitureItem {
    id: string;
    type: 'desk' | 'plant' | 'bookshelf' | 'coffee_machine' | 'table' | 'chair' | 'whiteboard';
    x: number;
    y: number;
    label?: string;
}

const FURNITURE_PALETTE: { type: FurnitureItem['type']; emoji: string; label: string }[] = [
    { type: 'desk', emoji: '🖥️', label: 'Desk' },
    { type: 'plant', emoji: '🌿', label: 'Plant' },
    { type: 'bookshelf', emoji: '📚', label: 'Bookshelf' },
    { type: 'coffee_machine', emoji: '☕', label: 'Coffee' },
    { type: 'table', emoji: '🪑', label: 'Table' },
    { type: 'chair', emoji: '💺', label: 'Chair' },
    { type: 'whiteboard', emoji: '📝', label: 'Board' },
];

export function LayoutEditor() {
    const [isOpen, setIsOpen] = useState(false);
    const [items, setItems] = useState<FurnitureItem[]>([]);
    const [selected, setSelected] = useState<FurnitureItem['type']>('desk');

    const addItem = () => {
        const newItem: FurnitureItem = {
            id: `item_${Date.now()}`,
            type: selected,
            x: Math.floor(Math.random() * 30) + 5,
            y: Math.floor(Math.random() * 30) + 5,
            label: FURNITURE_PALETTE.find(f => f.type === selected)?.label
        };
        setItems(prev => [...prev, newItem]);
    };

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const saveLayout = () => {
        const room = getColyseusRoom();
        if (room) {
            room.send('save-layout', { name: 'default', layout: items });
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    position: 'absolute', left: 20, bottom: 80,
                    padding: '8px 16px', borderRadius: 8, border: 'none',
                    backgroundColor: '#6c5ce7', color: 'white',
                    cursor: 'pointer', fontSize: '12px', fontWeight: 'bold',
                    boxShadow: '0 4px 12px rgba(108,92,231,0.4)',
                    zIndex: 10
                }}
            >
                🏗️ Layout Editor
            </button>
        );
    }

    return (
        <div style={{
            position: 'absolute', left: 20, bottom: 20, width: 280,
            backgroundColor: 'rgba(10,10,30,0.95)', color: 'white',
            padding: 16, borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            border: '1px solid rgba(108,92,231,0.3)',
            maxHeight: '40vh', display: 'flex', flexDirection: 'column',
            zIndex: 20
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: '14px' }}>🏗️ Office Layout Editor</h3>
                <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>

            {/* Furniture Palette */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                {FURNITURE_PALETTE.map(f => (
                    <button
                        key={f.type}
                        onClick={() => setSelected(f.type)}
                        style={{
                            padding: '4px 8px', borderRadius: 6, border: 'none',
                            backgroundColor: selected === f.type ? '#6c5ce7' : '#2d2d4d',
                            color: 'white', cursor: 'pointer', fontSize: '11px'
                        }}
                    >
                        {f.emoji} {f.label}
                    </button>
                ))}
            </div>

            <button onClick={addItem} style={{
                padding: '6px', borderRadius: 6, border: 'none',
                backgroundColor: '#00b894', color: 'white', cursor: 'pointer',
                fontSize: '11px', fontWeight: 'bold', marginBottom: 8
            }}>
                + Add {FURNITURE_PALETTE.find(f => f.type === selected)?.label}
            </button>

            {/* Item List */}
            <div style={{ flex: 1, overflowY: 'auto', fontSize: '11px', marginBottom: 8 }}>
                {items.length === 0 && (
                    <p style={{ color: '#555', fontStyle: 'italic', margin: 0 }}>
                        Select furniture type and click Add to place items.
                    </p>
                )}
                {items.map(item => (
                    <div key={item.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '4px 6px', marginBottom: 2, borderRadius: 4,
                        backgroundColor: 'rgba(255,255,255,0.05)'
                    }}>
                        <span>{FURNITURE_PALETTE.find(f => f.type === item.type)?.emoji} {item.label} ({item.x},{item.y})</span>
                        <button onClick={() => removeItem(item.id)} style={{
                            background: 'none', border: 'none', color: '#e17055',
                            cursor: 'pointer', fontSize: '12px'
                        }}>🗑</button>
                    </div>
                ))}
            </div>

            <button onClick={saveLayout} style={{
                padding: '8px', borderRadius: 6, border: 'none',
                backgroundColor: '#6c5ce7', color: 'white', cursor: 'pointer',
                fontSize: '12px', fontWeight: 'bold'
            }}>
                💾 Save Layout
            </button>
        </div>
    );
}
