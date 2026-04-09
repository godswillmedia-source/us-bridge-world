import path from 'path';
import dotenv from 'dotenv';

// Load .env from project root — try multiple resolution strategies
// so it works whether run from project root, packages/server/, or via tsx
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

import express from 'express';
import { Server } from 'colyseus';
import { createServer } from 'http';
import { OfficeRoom } from './rooms/OfficeRoom';
import { PublicSquareRoom } from './rooms/PublicSquareRoom';

// Setup Express
const app = express();
app.use(express.json());

// Basic REST API for Office Management
app.get('/api/offices', (req, res) => {
    res.json({ status: 'ok', offices: [] });
});

// Create HTTP and Colyseus server
const httpServer = createServer(app);
const colyseusServer = new Server({
    server: httpServer,
});

// Define Rooms
colyseusServer.define('office', OfficeRoom);
colyseusServer.define('public_square', PublicSquareRoom);

// Start listening
const PORT = Number(process.env.PORT || 3000);
colyseusServer.listen(PORT).then(() => {
    console.log(`[Server] AgentOffice Engine listening on ws://localhost:${PORT}`);
    console.log(`[Server] Rooms: office, public_square`);
    if (process.env.SUPABASE_URL) {
        console.log(`[Server] Supabase: ${process.env.SUPABASE_URL}`);
    } else {
        console.warn(`[Server] WARNING: No SUPABASE_URL set — PublicSquareRoom will not connect to bridge`);
    }
});
