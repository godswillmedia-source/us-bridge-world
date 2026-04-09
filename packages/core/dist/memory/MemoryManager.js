"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryManager = void 0;
class MemoryManager {
    constructor() {
        this.shortTerm = [];
    }
    generateId() {
        return Math.random().toString(36).substring(2, 9);
    }
    async add(memory) {
        const newMemory = { ...memory, id: this.generateId() };
        this.shortTerm.push(newMemory);
        if (this.shortTerm.length > 50) {
            this.shortTerm.shift(); // Evict oldest
        }
        // In a full implementation, we would persist this to an SQLite Database
    }
    async recall(query, limit = 5) {
        // Naive text match recall for scaffold phase
        // A robust system uses vector embeddings
        return this.shortTerm
            .filter(m => m.content.toLowerCase().includes(query.toLowerCase()))
            .slice(0, limit);
    }
    async recallRecent(limit) {
        return this.shortTerm.slice(Math.max(this.shortTerm.length - limit, 0));
    }
    async consolidate() {
        // Summarize old memories using LLM and store as condensed memory
    }
}
exports.MemoryManager = MemoryManager;
//# sourceMappingURL=MemoryManager.js.map