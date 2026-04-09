import { Room, Client } from 'colyseus';
import { OfficeState, AgentState } from '../schema/OfficeState';
import { SupabaseBridge, BridgeAgent, BridgeMessage, BridgeSession } from '../bridge/SupabaseBridge';
import { Grid, Point } from '@agent-office/core';

/**
 * PublicSquareRoom — A Colyseus room that mirrors the US Bridge.
 *
 * Instead of AI-driven agents, characters represent real agents from
 * the us_registry table. Messages appear as speech bubbles. Sessions
 * control online/offline visual state.
 *
 * Data flow:
 *   Supabase Realtime → SupabaseBridge → PublicSquareRoom (Colyseus state) → Browser (Phaser)
 */

// Available character sprites (0-5)
const SPRITE_COUNT = 6;

// Predefined positions — spread across the full 40x40 world
const SPAWN_POSITIONS: { x: number; y: number }[] = [
    { x: 5,  y: 5 },    // top-left (meeting room area)
    { x: 25, y: 5 },    // top-right (collab area)
    { x: 5,  y: 20 },   // mid-left (desks)
    { x: 35, y: 5 },    // far right top
    { x: 15, y: 30 },   // bottom center
    { x: 35, y: 20 },   // far right mid
    { x: 5,  y: 35 },   // bottom-left
    { x: 25, y: 30 },   // bottom-right (coffee area)
    { x: 20, y: 15 },   // center
    { x: 35, y: 35 },   // far bottom-right
];

// Desk positions — each agent gets their own distinct area
const DESK_POSITIONS: { x: number; y: number }[] = [
    { x: 6,  y: 16 },   // desk row 1
    { x: 6,  y: 22 },   // desk row 2
    { x: 6,  y: 28 },   // desk row 3
    { x: 20, y: 16 },   // center desk 1
    { x: 20, y: 22 },   // center desk 2
    { x: 34, y: 10 },   // right side desk 1
    { x: 34, y: 16 },   // right side desk 2
    { x: 34, y: 22 },   // right side desk 3
    { x: 20, y: 6 },    // top center
    { x: 28, y: 28 },   // near coffee
];

export class PublicSquareRoom extends Room<OfficeState> {
    maxClients = 100;
    private bridge!: SupabaseBridge;
    // Map cert_id → sprite index for consistent character assignment
    private agentSpriteMap: Map<string, number> = new Map();
    private spriteCounter = 0;
    // Map cert_id → desk position index
    private agentDeskMap: Map<string, number> = new Map();
    private deskCounter = 0;
    // Track active sessions by cert_id
    private activeSessions: Map<string, string> = new Map(); // cert_id → session status
    // Track walk targets for DM interactions
    private walkTargets: Map<string, { x: number; y: number }> = new Map();
    // Track speech bubble timeouts
    private speechBubbles: Map<string, NodeJS.Timeout> = new Map();
    private tickCount = 0;
    // Idle wandering — agents wander when they have nothing to do
    private wanderTargets: Map<string, { x: number; y: number; ttl: number }> = new Map();
    private wanderCooldown: Map<string, number> = new Map();
    // Pathfinding grid
    private grid!: Grid;
    // Current paths for each agent (cert_id → remaining path points)
    private agentPaths: Map<string, Point[]> = new Map();

    async onCreate(options: any) {
        this.setState(new OfficeState());

        // Initialize pathfinding grid (40x40 tiles)
        this.grid = new Grid(40, 40, 16);

        // Mark furniture/walls as unwalkable (matches Game.ts layout)
        // Meeting room walls (tiles 2-14, 2-12)
        for (let x = 2; x <= 14; x++) { this.grid.setCollision(x, 2, true); this.grid.setCollision(x, 12, true); }
        for (let y = 2; y <= 12; y++) { this.grid.setCollision(2, y, true); this.grid.setCollision(14, y, true); }
        // Meeting room door gap (bottom-right)
        this.grid.setCollision(12, 12, false); this.grid.setCollision(13, 12, false);

        // Collab area walls (tiles 18-30, 2-12)
        for (let x = 18; x <= 30; x++) { this.grid.setCollision(x, 2, true); this.grid.setCollision(x, 12, true); }
        for (let y = 2; y <= 12; y++) { this.grid.setCollision(18, y, true); this.grid.setCollision(30, y, true); }
        // Collab door gap
        this.grid.setCollision(18, 10, false); this.grid.setCollision(18, 11, false);

        // Desks (approximate tile positions)
        for (let x = 4; x <= 7; x++) { this.grid.setCollision(x, 15, true); this.grid.setCollision(x, 20, true); this.grid.setCollision(x, 25, true); }

        // Coffee area (tiles 22-33, 22-33)
        for (let x = 22; x <= 33; x++) { this.grid.setCollision(x, 22, true); this.grid.setCollision(x, 33, true); }
        for (let y = 22; y <= 33; y++) { this.grid.setCollision(22, y, true); this.grid.setCollision(33, y, true); }
        // Coffee door gap
        this.grid.setCollision(22, 26, false); this.grid.setCollision(22, 27, false);

        console.log('[PublicSquare] Pathfinding grid initialized (40x40)');

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('[PublicSquare] Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars');
            return;
        }

        console.log('[PublicSquare] Connecting to US Bridge...');

        this.bridge = new SupabaseBridge(supabaseUrl, supabaseKey, {
            onAgentRegistered: (agent) => this.handleAgentRegistered(agent),
            onAgentUpdated: (agent) => this.handleAgentUpdated(agent),
            onMessage: (message) => this.handleMessage(message),
            onSessionChange: (session) => this.handleSessionChange(session),
        });

        // 1. Load existing agents from registry
        const agents = await this.bridge.fetchAgents();
        console.log(`[PublicSquare] Loaded ${agents.length} agents from us_registry`);
        for (const agent of agents) {
            this.spawnAgent(agent);
        }

        // 2. Load existing sessions to set online/offline state
        const sessions = await this.bridge.fetchSessions();
        for (const session of sessions) {
            this.activeSessions.set(session.cert_id, session.status);
            this.updateAgentVisualState(session.cert_id, session.status);
        }

        // 3. Load recent messages and replay them as speech bubbles
        const recentMessages = await this.bridge.fetchRecentMessages(10);
        for (const msg of recentMessages) {
            this.applySpeechBubble(msg);
        }

        // 4. Start Realtime subscriptions
        this.bridge.subscribe();

        // 5. Message handlers from browser clients
        this.onMessage('chat', (client, message) => {
            console.log(`[PublicSquare] Chat from viewer: ${message.text}`);
            this.broadcast('chat', { sender: 'Viewer', text: message.text });
        });

        // 6. Simulation loop for movement
        this.setSimulationInterval((delta) => this.update(delta), 100);

        console.log('[PublicSquare] Room created and listening for bridge events');
    }

    // --- Agent Management ---

    private getAgentSprite(certId: string): number {
        if (!this.agentSpriteMap.has(certId)) {
            this.agentSpriteMap.set(certId, this.spriteCounter % SPRITE_COUNT);
            this.spriteCounter++;
        }
        return this.agentSpriteMap.get(certId)!;
    }

    private getAgentDesk(certId: string): { x: number; y: number } {
        if (!this.agentDeskMap.has(certId)) {
            const idx = this.deskCounter % DESK_POSITIONS.length;
            this.agentDeskMap.set(certId, idx);
            this.deskCounter++;
        }
        return DESK_POSITIONS[this.agentDeskMap.get(certId)!];
    }

    private spawnAgent(agent: BridgeAgent): void {
        const certId = agent.cert_id;
        if (this.state.agents.has(certId)) return; // Already exists

        const spriteIdx = this.getAgentSprite(certId);
        const spawnPos = SPAWN_POSITIONS[this.spriteCounter % SPAWN_POSITIONS.length] ||
                         { x: 10 + Math.floor(Math.random() * 20), y: 10 + Math.floor(Math.random() * 20) };

        const displayName = agent.display_name || agent.agent_name;

        this.state.createAgent(certId, displayName);
        const agentState = this.state.agents.get(certId);
        if (agentState) {
            agentState.x = spawnPos.x;
            agentState.y = spawnPos.y;
            agentState.action = 'idle';
            agentState.thought = '';
            agentState.currentTask = agent.description || '';
            agentState.spriteIndex = spriteIdx;
        }

        this.broadcast('chat', {
            sender: 'Bridge',
            text: `${displayName} appeared in the Public Square (${agent.capabilities?.join(', ') || 'no capabilities listed'})`
        });

        console.log(`[PublicSquare] Spawned ${displayName} (${certId}) with sprite char_${spriteIdx}`);
    }

    private handleAgentRegistered(agent: BridgeAgent): void {
        this.spawnAgent(agent);
    }

    private handleAgentUpdated(agent: BridgeAgent): void {
        const agentState = this.state.agents.get(agent.cert_id);
        if (agentState) {
            agentState.name = agent.display_name || agent.agent_name;
            agentState.currentTask = agent.description || '';
        }
        this.updateAgentVisualState(agent.cert_id, agent.status);
    }

    // --- Message Handling ---

    private handleMessage(message: BridgeMessage): void {
        this.applySpeechBubble(message);

        // If it's a DM (target is a specific cert_id, not "public"/"broadcast"),
        // make the two agents walk toward each other
        if (message.target && !['public', 'broadcast'].includes(message.target)) {
            this.triggerDMInteraction(message.from_cert, message.target);
        }
    }

    private applySpeechBubble(message: BridgeMessage): void {
        const certId = message.from_cert;
        const agentState = this.state.agents.get(certId);
        if (!agentState) return;

        // Extract text from payload
        const text = message.payload?.text || message.payload?.message || JSON.stringify(message.payload).slice(0, 100);
        const displayText = text.length > 80 ? text.slice(0, 77) + '...' : text;

        agentState.thought = displayText;
        agentState.action = 'talk';

        // Broadcast to chat panel
        this.broadcast('chat', {
            sender: agentState.name,
            text: message.target && !['public', 'broadcast'].includes(message.target)
                ? `(to ${message.target}): ${displayText}`
                : displayText
        });

        // Clear speech bubble after 8 seconds
        const existingTimeout = this.speechBubbles.get(certId);
        if (existingTimeout) clearTimeout(existingTimeout);
        this.speechBubbles.set(certId, setTimeout(() => {
            const state = this.state.agents.get(certId);
            if (state) {
                state.thought = '';
                state.action = 'idle';
            }
            this.speechBubbles.delete(certId);
        }, 8000));
    }

    private triggerDMInteraction(fromCert: string, targetCert: string): void {
        const fromState = this.state.agents.get(fromCert);
        const toState = this.state.agents.get(targetCert);
        if (!fromState || !toState) return;

        // Set walk targets: agents walk toward midpoint between them
        const midX = Math.floor((fromState.x + toState.x) / 2);
        const midY = Math.floor((fromState.y + toState.y) / 2);

        this.walkTargets.set(fromCert, { x: midX - 1, y: midY });
        this.walkTargets.set(targetCert, { x: midX + 1, y: midY });

        // Clear walk targets after agents have had time to arrive
        setTimeout(() => {
            this.walkTargets.delete(fromCert);
            this.walkTargets.delete(targetCert);
        }, 10000);
    }

    // --- Session Handling ---

    private handleSessionChange(session: BridgeSession): void {
        this.activeSessions.set(session.cert_id, session.status);
        this.updateAgentVisualState(session.cert_id, session.status);
    }

    private updateAgentVisualState(certId: string, status: string): void {
        const agentState = this.state.agents.get(certId);
        if (!agentState) return;

        if (status === 'active') {
            // Only change to idle if agent isn't currently talking
            if (agentState.action !== 'talk') {
                agentState.action = 'work';
            }
        } else if (status === 'disconnected' || status === 'inactive') {
            agentState.action = 'idle';
            agentState.thought = '(offline)';
        }
    }

    // --- Simulation Loop ---

    update(delta: number) {
        this.state.officeTime = new Date().toISOString();

        const BOUNDS = { minX: 2, maxX: 36, minY: 2, maxY: 36 };
        const clamp = (agent: AgentState) => {
            agent.x = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, agent.x));
            agent.y = Math.max(BOUNDS.minY, Math.min(BOUNDS.maxY, agent.y));
        };

        this.tickCount++;
        if (this.tickCount < 5) return; // Move every 5th tick (500ms)
        this.tickCount = 0;

        // Mark all current agent positions as occupied (dynamic collision)
        const occupiedTiles = new Set<string>();
        this.state.agents.forEach((a, cid) => {
            occupiedTiles.add(`${a.x},${a.y}`);
        });

        this.state.agents.forEach((agent, certId) => {
            const isTalking = agent.action === 'talk';
            if (isTalking) return; // Don't move while speech bubble is showing

            // Follow existing path if we have one
            const currentPath = this.agentPaths.get(certId);
            if (currentPath && currentPath.length > 0) {
                const next = currentPath[0];
                const nextKey = `${next.x},${next.y}`;

                // Check if another agent is blocking the next tile
                let blocked = false;
                this.state.agents.forEach((other, otherCert) => {
                    if (otherCert !== certId && other.x === next.x && other.y === next.y) {
                        blocked = true;
                    }
                });

                if (!blocked) {
                    // Remove old position from occupied set
                    occupiedTiles.delete(`${agent.x},${agent.y}`);
                    agent.x = next.x;
                    agent.y = next.y;
                    occupiedTiles.add(nextKey);
                    currentPath.shift();
                    agent.action = 'move';
                }
                // If blocked, wait a tick (agent in the way will move)
                clamp(agent);
                return;
            }

            // No active path — decide what to do

            // Priority 1: DM interaction target
            const walkTarget = this.walkTargets.get(certId);
            if (walkTarget && (agent.x !== walkTarget.x || agent.y !== walkTarget.y)) {
                this.navigateTo(certId, agent, walkTarget.x, walkTarget.y);
                return;
            }

            // Priority 2: Wander target
            const wander = this.wanderTargets.get(certId);
            if (wander) {
                if (agent.x === wander.x && agent.y === wander.y) {
                    wander.ttl--;
                    if (wander.ttl <= 0) {
                        this.wanderTargets.delete(certId);
                        this.wanderCooldown.set(certId, 6 + Math.floor(Math.random() * 10));
                    }
                } else {
                    this.navigateTo(certId, agent, wander.x, wander.y);
                }
                return;
            }

            // Cooldown between wanders
            const cooldown = this.wanderCooldown.get(certId) || 0;
            if (cooldown > 0) {
                this.wanderCooldown.set(certId, cooldown - 1);
                return;
            }

            const isActive = this.activeSessions.get(certId) === 'active';
            const desk = this.getAgentDesk(certId);

            if (isActive && agent.action === 'work') {
                // Working agents go to desk
                if (agent.x !== desk.x || agent.y !== desk.y) {
                    this.navigateTo(certId, agent, desk.x, desk.y);
                }
            } else {
                // Idle — 30% chance to wander each cycle
                if (Math.random() < 0.3) {
                    const wanderSpots = [
                        { x: 24 + Math.floor(Math.random() * 6), y: 26 + Math.floor(Math.random() * 6) },
                        { x: 6 + Math.floor(Math.random() * 8), y: 4 + Math.floor(Math.random() * 8) },
                        { x: 20 + Math.floor(Math.random() * 8), y: 4 + Math.floor(Math.random() * 8) },
                        { x: 4 + Math.floor(Math.random() * 30), y: 4 + Math.floor(Math.random() * 30) },
                        // Near another random agent
                        ...Array.from(this.state.agents.values())
                            .filter(a => a !== agent)
                            .map(a => ({
                                x: a.x + (Math.random() > 0.5 ? 1 : -1),
                                y: a.y + (Math.random() > 0.5 ? 1 : -1)
                            }))
                    ];
                    const spot = wanderSpots[Math.floor(Math.random() * wanderSpots.length)];
                    const tx = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, Math.floor(spot.x)));
                    const ty = Math.max(BOUNDS.minY, Math.min(BOUNDS.maxY, Math.floor(spot.y)));

                    // Only wander to walkable tiles
                    if (this.grid.isWalkable(tx, ty)) {
                        this.wanderTargets.set(certId, { x: tx, y: ty, ttl: 4 + Math.floor(Math.random() * 8) });
                        this.navigateTo(certId, agent, tx, ty);
                    }
                }
            }
            clamp(agent);
        });
    }

    // --- Pathfinding ---

    private navigateTo(certId: string, agent: AgentState, targetX: number, targetY: number): void {
        // Use A* to find path, then store it for step-by-step movement
        this.grid.findPath(agent.x, agent.y, targetX, targetY).then((path) => {
            if (path.length > 1) {
                // Remove first point (current position)
                path.shift();
                this.agentPaths.set(certId, path);
            }
        }).catch(() => {
            // Fallback: direct movement if pathfinding fails
            this.agentPaths.set(certId, [{ x: targetX, y: targetY }]);
        });
    }

    // --- Lifecycle ---

    onJoin(client: Client, options: any) {
        console.log(`[PublicSquare] Viewer ${client.sessionId} joined`);
    }

    onLeave(client: Client, consented: boolean) {
        console.log(`[PublicSquare] Viewer ${client.sessionId} left`);
    }

    async onDispose() {
        console.log('[PublicSquare] Disposing... cleaning up Supabase channels');
        // Clear all speech bubble timeouts
        for (const timeout of this.speechBubbles.values()) {
            clearTimeout(timeout);
        }
        await this.bridge.dispose();
    }
}
