"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load .env from project root — try multiple resolution strategies
// so it works whether run from project root, packages/server/, or via tsx
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '../../.env') });
const express_1 = __importDefault(require("express"));
const colyseus_1 = require("colyseus");
const http_1 = require("http");
const OfficeRoom_1 = require("./rooms/OfficeRoom");
const PublicSquareRoom_1 = require("./rooms/PublicSquareRoom");
// Setup Express
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Basic REST API for Office Management
app.get('/api/offices', (req, res) => {
    res.json({ status: 'ok', offices: [] });
});
// Create HTTP and Colyseus server
const httpServer = (0, http_1.createServer)(app);
const colyseusServer = new colyseus_1.Server({
    server: httpServer,
});
// Define Rooms
colyseusServer.define('office', OfficeRoom_1.OfficeRoom);
colyseusServer.define('public_square', PublicSquareRoom_1.PublicSquareRoom);
// Start listening
const PORT = Number(process.env.PORT || 3000);
colyseusServer.listen(PORT).then(() => {
    console.log(`[Server] AgentOffice Engine listening on ws://localhost:${PORT}`);
    console.log(`[Server] Rooms: office, public_square`);
    if (process.env.SUPABASE_URL) {
        console.log(`[Server] Public Supabase: ${process.env.SUPABASE_URL}`);
    }
    else {
        console.warn(`[Server] WARNING: No SUPABASE_URL set — PublicSquareRoom will not connect to bridge`);
    }
    if (process.env.INTERNAL_SUPABASE_URL) {
        console.log(`[Server] Internal Supabase: ${process.env.INTERNAL_SUPABASE_URL}`);
    }
    else {
        console.warn(`[Server] WARNING: No INTERNAL_SUPABASE_URL set — internal bridge disabled`);
    }
});
//# sourceMappingURL=index.js.map