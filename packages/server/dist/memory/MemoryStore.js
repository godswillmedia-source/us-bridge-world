"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStore = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
function cosineSimilarity(a, b) {
    if (a.length !== b.length)
        return 0;
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
}
class MemoryStore {
    constructor(ollamaUrl = 'http://localhost:11434') {
        this.ollamaUrl = ollamaUrl;
    }
    async initialize(dbPath = './data/office-memory.db') {
        // Ensure data directory exists
        const { mkdir } = await Promise.resolve().then(() => __importStar(require('fs/promises')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        await mkdir(path.dirname(dbPath), { recursive: true });
        this.db = await (0, sqlite_1.open)({
            filename: dbPath,
            driver: sqlite3_1.default.Database
        });
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_id TEXT NOT NULL,
                content TEXT NOT NULL,
                type TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                importance REAL NOT NULL DEFAULT 0.5,
                embedding TEXT,
                session_id TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_memories_agent ON memories(agent_id);
            CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance DESC);

            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                assigned_to TEXT,
                status TEXT DEFAULT 'pending',
                created_at TEXT DEFAULT (datetime('now')),
                completed_at TEXT
            );

            CREATE TABLE IF NOT EXISTS office_layout (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                layout_json TEXT NOT NULL,
                name TEXT NOT NULL DEFAULT 'default',
                updated_at TEXT DEFAULT (datetime('now'))
            );
        `);
        // Migration: add embedding column to existing databases
        try {
            await this.db.exec('ALTER TABLE memories ADD COLUMN embedding TEXT');
        }
        catch {
            // Column already exists — ignore
        }
        console.log('[MemoryStore] SQLite initialized at', dbPath);
    }
    // --- Embedding Generation ---
    async generateEmbedding(text) {
        try {
            const res = await fetch(`${this.ollamaUrl}/api/embeddings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'llama3.2:latest', prompt: text })
            });
            const data = await res.json();
            return data.embedding || null;
        }
        catch {
            return null;
        }
    }
    // --- Memory Operations ---
    async saveMemory(agentId, entry, sessionId) {
        if (!this.db)
            return;
        // Generate embedding for semantic search (async, non-blocking)
        let embeddingStr = null;
        if (entry.importance >= 0.5) {
            const embedding = await this.generateEmbedding(entry.content);
            if (embedding)
                embeddingStr = JSON.stringify(embedding);
        }
        await this.db.run('INSERT INTO memories (agent_id, content, type, timestamp, importance, embedding, session_id) VALUES (?, ?, ?, ?, ?, ?, ?)', [agentId, entry.content, entry.type, entry.timestamp, entry.importance, embeddingStr, sessionId || null]);
    }
    async saveMemories(agentId, entries, sessionId) {
        for (const entry of entries) {
            await this.saveMemory(agentId, entry, sessionId);
        }
    }
    async loadMemories(agentId, limit = 20) {
        if (!this.db)
            return [];
        const rows = await this.db.all('SELECT content, type, timestamp, importance FROM memories WHERE agent_id = ? ORDER BY importance DESC, created_at DESC LIMIT ?', [agentId, limit]);
        return rows.map((r) => ({
            content: r.content,
            type: r.type,
            timestamp: r.timestamp,
            importance: r.importance
        }));
    }
    async semanticSearch(agentId, query, topK = 5) {
        if (!this.db)
            return [];
        const queryEmbedding = await this.generateEmbedding(query);
        if (!queryEmbedding)
            return this.loadMemories(agentId, topK); // Fallback to recency
        const rows = await this.db.all('SELECT content, type, timestamp, importance, embedding FROM memories WHERE agent_id = ? AND embedding IS NOT NULL', [agentId]);
        const scored = rows.map((r) => {
            const emb = JSON.parse(r.embedding);
            const score = cosineSimilarity(queryEmbedding, emb);
            return { content: r.content, type: r.type, timestamp: r.timestamp, importance: r.importance, score };
        }).sort((a, b) => b.score - a.score);
        return scored.slice(0, topK).map(s => ({
            content: s.content,
            type: s.type,
            timestamp: s.timestamp,
            importance: s.importance
        }));
    }
    // --- Task Operations ---
    async createTask(title, assignedTo) {
        if (!this.db)
            return -1;
        const result = await this.db.run('INSERT INTO tasks (title, assigned_to) VALUES (?, ?)', [title, assignedTo || null]);
        return result.lastID || -1;
    }
    async getTasks() {
        if (!this.db)
            return [];
        return this.db.all('SELECT * FROM tasks ORDER BY created_at DESC LIMIT 50');
    }
    async assignTask(taskId, agentId) {
        if (!this.db)
            return;
        await this.db.run('UPDATE tasks SET assigned_to = ?, status = ? WHERE id = ?', [agentId, 'in_progress', taskId]);
    }
    async completeTask(taskId) {
        if (!this.db)
            return;
        await this.db.run("UPDATE tasks SET status = 'completed', completed_at = datetime('now') WHERE id = ?", [taskId]);
    }
    // --- Layout Operations ---
    async saveLayout(name, layoutJson) {
        if (!this.db)
            return;
        const existing = await this.db.get('SELECT id FROM office_layout WHERE name = ?', [name]);
        if (existing) {
            await this.db.run("UPDATE office_layout SET layout_json = ?, updated_at = datetime('now') WHERE name = ?", [layoutJson, name]);
        }
        else {
            await this.db.run('INSERT INTO office_layout (name, layout_json) VALUES (?, ?)', [name, layoutJson]);
        }
    }
    async loadLayout(name = 'default') {
        if (!this.db)
            return null;
        const row = await this.db.get('SELECT layout_json FROM office_layout WHERE name = ?', [name]);
        return row ? JSON.parse(row.layout_json) : null;
    }
    async close() {
        if (this.db)
            await this.db.close();
    }
}
exports.MemoryStore = MemoryStore;
//# sourceMappingURL=MemoryStore.js.map