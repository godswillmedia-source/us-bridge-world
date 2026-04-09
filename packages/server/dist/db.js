"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openDb = openDb;
exports.initializeDb = initializeDb;
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
async function openDb() {
    return (0, sqlite_1.open)({
        filename: process.env.DATABASE_URL?.replace('sqlite:', '') || './office.db',
        driver: sqlite3_1.default.Database
    });
}
async function initializeDb(db) {
    await db.exec(`
    CREATE TABLE IF NOT EXISTS offices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      config JSON NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      office_id TEXT REFERENCES offices(id),
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      config JSON NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      agent_id TEXT REFERENCES agents(id),
      type TEXT,
      content TEXT NOT NULL,
      importance REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
//# sourceMappingURL=db.js.map