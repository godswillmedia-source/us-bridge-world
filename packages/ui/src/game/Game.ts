import Phaser from 'phaser';
import * as Colyseus from 'colyseus.js';
import { OfficeState, AgentState } from './schema';
import { eventBus } from '../events';

let activeRoom: Colyseus.Room<OfficeState> | undefined;

export function getColyseusRoom() {
    return activeRoom;
}

export class OfficeScene extends Phaser.Scene {
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private room?: Colyseus.Room;
    private agentSprites: Map<string, Phaser.GameObjects.Container> = new Map();
    private statusText!: Phaser.GameObjects.Text;
    private followTarget: Phaser.GameObjects.Container | null = null;

    constructor() {
        super('OfficeScene');
    }

    preload() {
        this.load.spritesheet('char_0', '/assets/characters/char_0.png', {
            frameWidth: 16,
            frameHeight: 32
        });
        this.load.spritesheet('char_1', '/assets/characters/char_1.png', {
            frameWidth: 16,
            frameHeight: 32
        });
    }

    create() {
        try {
            console.log("Phaser create() started");
            this.statusText = this.add.text(10, 10, 'Colyseus Sync: Connecting...', { color: '#ffffaa', fontSize: '14px' });
            this.statusText.setScrollFactor(0);
            this.statusText.setDepth(100);

            let hasAnims = false;

            // Create animations for character 0
            if (this.textures.exists('char_0')) {
                const anims = this.anims;
                anims.create({ key: 'char_0-walk-down', frames: anims.generateFrameNumbers('char_0', { start: 0, end: 2 }), frameRate: 8, repeat: -1 });
                anims.create({ key: 'char_0-walk-up', frames: anims.generateFrameNumbers('char_0', { start: 7, end: 9 }), frameRate: 8, repeat: -1 });
                anims.create({ key: 'char_0-walk-right', frames: anims.generateFrameNumbers('char_0', { start: 14, end: 16 }), frameRate: 8, repeat: -1 });
                hasAnims = true;
            }
            // Create animations for character 1
            if (this.textures.exists('char_1')) {
                const anims = this.anims;
                anims.create({ key: 'char_1-walk-down', frames: anims.generateFrameNumbers('char_1', { start: 0, end: 2 }), frameRate: 8, repeat: -1 });
                anims.create({ key: 'char_1-walk-up', frames: anims.generateFrameNumbers('char_1', { start: 7, end: 9 }), frameRate: 8, repeat: -1 });
                anims.create({ key: 'char_1-walk-right', frames: anims.generateFrameNumbers('char_1', { start: 14, end: 16 }), frameRate: 8, repeat: -1 });
            }

            console.log("Animations created: ", hasAnims);

            const gridSize = 40 * 16;
            const g = this.add.graphics();

            // ═══════════════════════════════════════════
            //  FLOORING
            // ═══════════════════════════════════════════

            // Main office floor (warm grey carpet)
            g.fillStyle(0x2d2d3d, 1);
            g.fillRect(0, 0, gridSize, gridSize);

            // Work area floor (slightly lighter)
            g.fillStyle(0x33334a, 1);
            g.fillRect(16, 16, gridSize - 32, gridSize - 32);

            // Meeting room carpet (purple-tinted)
            g.fillStyle(0x352a45, 1);
            g.fillRect(32, 32, 200, 160);

            // Collab area carpet (warm orange-tinted)
            g.fillStyle(0x3d3025, 1);
            g.fillRect(280, 32, 200, 160);

            // Coffee area tiles (subtle checkerboard)
            for (let tx = 0; tx < 11; tx++) {
                for (let ty = 0; ty < 11; ty++) {
                    g.fillStyle((tx + ty) % 2 === 0 ? 0x2a3a2a : 0x253025, 1);
                    g.fillRect(350 + tx * 16, 350 + ty * 16, 16, 16);
                }
            }

            // ═══════════════════════════════════════════
            //  WALLS & PARTITIONS
            // ═══════════════════════════════════════════

            // Meeting room walls
            g.lineStyle(3, 0x6c5ce7, 0.9);
            g.strokeRect(32, 32, 200, 160);
            // Door gap (bottom-right of meeting room)
            g.fillStyle(0x33334a, 1);
            g.fillRect(192, 188, 40, 6);

            // Collab area walls
            g.lineStyle(3, 0xe17055, 0.9);
            g.strokeRect(280, 32, 200, 160);
            // Door gap
            g.fillStyle(0x33334a, 1);
            g.fillRect(280, 160, 40, 6);

            // Coffee area border
            g.lineStyle(2, 0x00b894, 0.7);
            g.strokeRect(350, 350, 176, 176);
            // Door gap
            g.fillStyle(0x33334a, 1);
            g.fillRect(350, 410, 4, 40);

            // Room labels
            this.add.text(132, 46, '🏢 Meeting Room', { fontSize: '10px', color: '#b8a9d4' }).setOrigin(0.5);
            this.add.text(380, 46, '💡 Collab Area', { fontSize: '10px', color: '#e8a87c' }).setOrigin(0.5);
            this.add.text(438, 364, '☕ Coffee & Pantry', { fontSize: '10px', color: '#7fcdaa' }).setOrigin(0.5);

            // ═══════════════════════════════════════════
            //  MEETING ROOM FURNITURE
            // ═══════════════════════════════════════════

            // Large meeting table
            g.fillStyle(0x6d4c2e, 1);
            g.fillRect(72, 80, 120, 60);
            g.fillStyle(0x7d5c3e, 1);
            g.fillRect(76, 84, 112, 52); // table top highlight

            // Chairs around meeting table (pixel circles)
            const chairColor = 0x4a4a6a;
            const chairs = [[92, 72], [132, 72], [172, 72], // top row
            [92, 148], [132, 148], [172, 148], // bottom row
            [64, 100], [64, 128], // left
            [200, 100], [200, 128]]; // right
            chairs.forEach(([cx, cy]) => {
                g.fillStyle(chairColor, 1);
                g.fillCircle(cx, cy, 6);
                g.fillStyle(0x5a5a7a, 1);
                g.fillCircle(cx, cy, 4);
            });

            // Whiteboard on meeting room wall
            g.fillStyle(0xdfe6e9, 1);
            g.fillRect(48, 36, 60, 30);
            g.lineStyle(2, 0x636e72, 1);
            g.strokeRect(48, 36, 60, 30);
            // Whiteboard scribbles
            g.lineStyle(1, 0x0984e3, 0.6);
            g.beginPath();
            g.moveTo(54, 46); g.lineTo(70, 42); g.lineTo(85, 50); g.lineTo(100, 44);
            g.strokePath();
            g.lineStyle(1, 0xd63031, 0.6);
            g.beginPath();
            g.moveTo(54, 54); g.lineTo(75, 58); g.lineTo(95, 52);
            g.strokePath();

            // ═══════════════════════════════════════════
            //  COLLAB AREA FURNITURE
            // ═══════════════════════════════════════════

            // Standing desks (2 side by side)
            g.fillStyle(0x5a3e28, 1);
            g.fillRect(300, 70, 48, 28);
            g.fillStyle(0x6a4e38, 1);
            g.fillRect(302, 72, 44, 24);

            g.fillStyle(0x5a3e28, 1);
            g.fillRect(410, 70, 48, 28);
            g.fillStyle(0x6a4e38, 1);
            g.fillRect(412, 72, 44, 24);

            // Laptops on standing desks
            const drawLaptop = (lx: number, ly: number) => {
                g.fillStyle(0x636e72, 1);
                g.fillRect(lx, ly, 16, 10); // screen
                g.fillStyle(0x2d3436, 1);
                g.fillRect(lx + 1, ly + 1, 14, 8);
                g.fillStyle(0x636e72, 1);
                g.fillRect(lx - 1, ly + 10, 18, 3); // keyboard
            };
            drawLaptop(312, 76);
            drawLaptop(424, 76);

            // Bean bags / lounge chairs in collab
            g.fillStyle(0xe17055, 0.6);
            g.fillCircle(320, 150, 14);
            g.fillStyle(0xfdcb6e, 0.6);
            g.fillCircle(370, 155, 14);
            g.fillStyle(0x6c5ce7, 0.6);
            g.fillCircle(430, 148, 14);

            // ═══════════════════════════════════════════
            //  WORK DESKS (with chairs in front)
            // ═══════════════════════════════════════════

            const drawWorkstation = (x: number, y: number, label: string, occupied: boolean) => {
                // Desk surface
                g.fillStyle(0x5a3e28, 1);
                g.fillRect(x, y, 56, 28);
                g.fillStyle(0x6d4c2e, 1);
                g.fillRect(x + 2, y + 2, 52, 24);

                // Monitor
                g.fillStyle(0x2d3436, 1);
                g.fillRect(x + 6, y + 3, 22, 14); // bezel
                g.fillStyle(occupied ? 0x74b9ff : 0x2d3436, 1);
                g.fillRect(x + 8, y + 5, 18, 10); // screen glow
                g.fillStyle(0x636e72, 1);
                g.fillRect(x + 14, y + 17, 10, 3); // stand
                g.fillRect(x + 10, y + 20, 18, 2); // base

                // Keyboard
                g.fillStyle(0xb2bec3, 1);
                g.fillRect(x + 6, y + 22, 18, 4);

                // Mouse
                g.fillStyle(0xb2bec3, 1);
                g.fillRect(x + 28, y + 22, 5, 4);

                // Notepad
                g.fillStyle(0xffeaa7, 1);
                g.fillRect(x + 36, y + 6, 12, 16);
                g.lineStyle(1, 0xfdcb6e, 0.8);
                g.beginPath();
                g.moveTo(x + 38, y + 10); g.lineTo(x + 46, y + 10);
                g.moveTo(x + 38, y + 14); g.lineTo(x + 46, y + 14);
                g.moveTo(x + 38, y + 18); g.lineTo(x + 44, y + 18);
                g.strokePath();

                // Pen
                g.fillStyle(0x0984e3, 1);
                g.fillRect(x + 50, y + 8, 2, 12);

                // Coffee mug
                g.fillStyle(0xd63031, 1);
                g.fillCircle(x + 37, y + 24, 3);
                g.fillStyle(0x2d3436, 1);
                g.fillCircle(x + 37, y + 24, 1.5);

                // Office chair (below desk)
                g.fillStyle(0x2d3436, 1);
                g.fillCircle(x + 22, y + 38, 8);
                g.fillStyle(occupied ? 0x6c5ce7 : 0x4a4a6a, 1);
                g.fillCircle(x + 22, y + 38, 6);

                // Label
                this.add.text(x + 28, y - 6, label, { fontSize: '8px', color: '#a0a0c0' }).setOrigin(0.5);
            };

            drawWorkstation(64, 240, '💻 Alice\'s Desk', true);
            drawWorkstation(64, 320, '💻 Bob\'s Desk', true);
            drawWorkstation(64, 400, '💻 Vacant', false);

            // ═══════════════════════════════════════════
            //  COFFEE & PANTRY AREA
            // ═══════════════════════════════════════════

            // Counter
            g.fillStyle(0x5a3e28, 1);
            g.fillRect(370, 380, 80, 20);
            g.fillStyle(0x6d4c2e, 1);
            g.fillRect(372, 382, 76, 16);

            // Coffee machine
            g.fillStyle(0x2d3436, 1);
            g.fillRect(380, 370, 20, 24);
            g.fillStyle(0x636e72, 1);
            g.fillRect(382, 372, 16, 12);
            g.fillStyle(0xd63031, 1);
            g.fillCircle(390, 390, 2); // power light

            // Microwave
            g.fillStyle(0xdfe6e9, 1);
            g.fillRect(410, 372, 20, 16);
            g.fillStyle(0x2d3436, 1);
            g.fillRect(412, 374, 12, 12);
            g.fillStyle(0x00b894, 1);
            g.fillRect(427, 376, 2, 2); // light

            // Small table with snacks
            g.fillStyle(0x5a3e28, 1);
            g.fillRect(380, 440, 40, 30);
            g.fillStyle(0x6d4c2e, 1);
            g.fillRect(382, 442, 36, 26);
            // Fruit bowl
            g.fillStyle(0xfdcb6e, 1);
            g.fillCircle(392, 452, 4);
            g.fillStyle(0xe17055, 1);
            g.fillCircle(400, 450, 3);
            g.fillStyle(0x00b894, 1);
            g.fillCircle(408, 454, 4);

            // Chairs around snack table
            g.fillStyle(0x4a4a6a, 1);
            g.fillCircle(375, 445, 5);
            g.fillCircle(375, 460, 5);
            g.fillCircle(425, 445, 5);
            g.fillCircle(425, 460, 5);

            // Water cooler
            g.fillStyle(0x74b9ff, 0.6);
            g.fillRect(470, 380, 12, 24);
            g.fillStyle(0xdfe6e9, 1);
            g.fillRect(468, 404, 16, 16);
            g.fillStyle(0x74b9ff, 0.4);
            g.fillRect(470, 382, 8, 16); // water level
            this.add.text(476, 424, '💧', { fontSize: '8px' }).setOrigin(0.5);

            // ═══════════════════════════════════════════
            //  DECORATIONS
            // ═══════════════════════════════════════════

            // Potted plants
            const drawPlant = (px: number, py: number) => {
                // Pot
                g.fillStyle(0x8b4513, 1);
                g.fillRect(px - 5, py, 10, 8);
                g.fillStyle(0xa0522d, 1);
                g.fillRect(px - 4, py + 1, 8, 6);
                // Soil
                g.fillStyle(0x3e2723, 1);
                g.fillRect(px - 3, py, 6, 2);
                // Leaves
                g.fillStyle(0x27ae60, 1);
                g.fillCircle(px, py - 4, 6);
                g.fillStyle(0x2ecc71, 1);
                g.fillCircle(px - 3, py - 6, 4);
                g.fillCircle(px + 4, py - 5, 4);
            };

            drawPlant(24, 210);   // near desks
            drawPlant(140, 210);  // between meeting room and desks
            drawPlant(250, 210);  // center
            drawPlant(530, 380);  // near coffee area
            drawPlant(24, 500);   // bottom left
            drawPlant(550, 200);  // right side

            // Bookshelf on right wall
            g.fillStyle(0x5a3e28, 1);
            g.fillRect(540, 50, 40, 80);
            g.fillStyle(0x6d4c2e, 1);
            g.fillRect(542, 52, 36, 18); // shelf 1
            g.fillRect(542, 72, 36, 18); // shelf 2
            g.fillRect(542, 92, 36, 18); // shelf 3
            // Books
            const bookColors = [0xd63031, 0x0984e3, 0xfdcb6e, 0x00b894, 0x6c5ce7, 0xe17055];
            for (let b = 0; b < 6; b++) {
                g.fillStyle(bookColors[b], 1);
                g.fillRect(544 + b * 5, 54, 4, 14);
            }
            for (let b = 0; b < 5; b++) {
                g.fillStyle(bookColors[b + 1], 1);
                g.fillRect(544 + b * 6, 74, 4, 14);
            }

            // Printer
            g.fillStyle(0xdfe6e9, 1);
            g.fillRect(540, 140, 30, 18);
            g.fillStyle(0xb2bec3, 1);
            g.fillRect(542, 142, 26, 10);
            g.fillStyle(0x2d3436, 1);
            g.fillRect(545, 155, 6, 2); // paper slot
            this.add.text(555, 164, '🖨️', { fontSize: '8px' }).setOrigin(0.5);

            // Welcome mat / rug at center
            g.fillStyle(0x6c5ce7, 0.15);
            g.fillRect(200, 240, 120, 80);
            g.lineStyle(1, 0x6c5ce7, 0.3);
            g.strokeRect(200, 240, 120, 80);

            // ═══════════════════════════════════════════
            //  SUBTLE GRID (very faint)
            // ═══════════════════════════════════════════
            g.lineStyle(1, 0x444466, 0.12);
            g.beginPath();
            for (let i = 0; i <= gridSize; i += 16) {
                g.moveTo(i, 0).lineTo(i, gridSize);
                g.moveTo(0, i).lineTo(gridSize, i);
            }
            g.strokePath();

            this.cameras.main.setBackgroundColor('#16213e');
            this.cameras.main.setZoom(2);
            this.cameras.main.centerOn(gridSize / 2, gridSize / 2);

            if (this.input.keyboard) {
                this.cursors = this.input.keyboard.createCursorKeys();
            }

            this.connectToServer();
        } catch (e) {
            console.error("CRITICAL PHASER ERROR", e);
        }
    }

    async connectToServer() {
        try {
            console.log("Connecting to Colyseus...");
            const client = new Colyseus.Client('ws://localhost:3000');
            this.room = await client.joinOrCreate('office');

            console.log("Room joined successfully!", this.room.sessionId);
            this.statusText.setText('Colyseus Sync: Connected (Waiting for state...)').setColor('#aaffaa');

            // Wait for the first actual state payload from the server before reading
            this.room.onStateChange.once((state: any) => {
                activeRoom = this.room as Colyseus.Room<OfficeState>;
                console.log("First state payload arrived!", state.toJSON());
                console.log("Agents map size:", state.agents?.size);
                this.statusText.setText('Colyseus Sync: Active!').setColor('#00ff00');

                // Bind chat bus
                this.room!.onMessage('chat', (message: any) => {
                    eventBus.dispatchEvent(new CustomEvent('chat-message', { detail: message }));
                });

                state.agents.onAdd((agent: AgentState, sessionId: string) => {
                    console.log(`[Colyseus] Agent added: ${agent.name} at (${agent.x}, ${agent.y})`);
                    const container = this.add.container(agent.x * 16, agent.y * 16);

                    let sprite;
                    let charKey = 'char_0';
                    if (agent.name.includes('Bob')) charKey = 'char_1';

                    if (this.textures.exists(charKey)) {
                        sprite = this.add.sprite(0, -8, charKey, 0);
                    } else {
                        sprite = this.add.rectangle(0, -8, 16, 32, 0x3a86ff);
                    }

                    // Thought bubble (word-wrapped)
                    const thoughtBubble = this.add.text(0, -36, '', {
                        fontSize: '9px',
                        color: '#e0e0e0',
                        backgroundColor: '#1a1a3eee',
                        padding: { x: 5, y: 4 },
                        align: 'center',
                        wordWrap: { width: 130, useAdvancedWrap: true }
                    }).setOrigin(0.5, 1);
                    thoughtBubble.setVisible(false);

                    // Emote bubble (emoji above head)
                    const emoteBubble = this.add.text(8, -24, '', {
                        fontSize: '12px'
                    }).setOrigin(0.5);
                    emoteBubble.setVisible(false);

                    // Name label
                    const label = this.add.text(0, 16, agent.name, {
                        fontSize: '10px', color: '#ffffff',
                        backgroundColor: '#00000088', padding: { x: 2, y: 1 }
                    }).setOrigin(0.5, 0);

                    // Focus highlight ring (hidden by default)
                    const focusRing = this.add.graphics();
                    focusRing.lineStyle(1, 0x6c5ce7, 0.8);
                    focusRing.strokeCircle(0, 0, 14);
                    focusRing.setVisible(false);

                    container.add([focusRing, sprite, thoughtBubble, emoteBubble, label]);
                    container.setSize(32, 48);
                    container.setInteractive();
                    this.agentSprites.set(sessionId, container);

                    // --- FOCUS MODE: Click to follow ---
                    container.on('pointerdown', () => {
                        if (this.followTarget === container) {
                            // Unfollow on second click
                            this.followTarget = null;
                            focusRing.setVisible(false);
                            eventBus.dispatchEvent(new CustomEvent('agent-focus', { detail: null }));
                        } else {
                            // Unfollow previous
                            if (this.followTarget) {
                                const prevRing = this.followTarget.getAt(0) as Phaser.GameObjects.Graphics;
                                prevRing?.setVisible(false);
                            }
                            this.followTarget = container;
                            focusRing.setVisible(true);
                            eventBus.dispatchEvent(new CustomEvent('agent-focus', { detail: { name: agent.name, id: sessionId } }));
                        }
                    });

                    let prevX = agent.x;
                    let prevY = agent.y;
                    let lastAction = '';

                    agent.onChange(() => {
                        this.tweens.add({
                            targets: container,
                            x: agent.x * 16,
                            y: agent.y * 16,
                            duration: 100,
                            onComplete: () => {
                                if (sprite.type === 'Sprite') {
                                    (sprite as Phaser.GameObjects.Sprite).stop();
                                }
                            }
                        });

                        // Walk animation
                        if (sprite.type === 'Sprite') {
                            const s = sprite as Phaser.GameObjects.Sprite;
                            if (agent.x > prevX) { s.play(`${charKey}-walk-right`, true); s.setFlipX(false); }
                            else if (agent.x < prevX) { s.play(`${charKey}-walk-right`, true); s.setFlipX(true); }
                            else if (agent.y > prevY) { s.play(`${charKey}-walk-down`, true); }
                            else if (agent.y < prevY) { s.play(`${charKey}-walk-up`, true); }
                            else { s.stop(); }
                        }

                        // --- EMOTE BUBBLES based on action ---
                        const emoteMap: Record<string, string> = {
                            'work': '💻', 'talk': '💬', 'idle': '😌',
                            'use_tool': '🔧', 'move': '🚶', 'think': '💡'
                        };
                        const emote = emoteMap[agent.action] || '';
                        if (emote && agent.action !== lastAction) {
                            emoteBubble.setText(emote);
                            emoteBubble.setVisible(true);
                            // Auto-hide after 3s
                            this.time.delayedCall(3000, () => emoteBubble.setVisible(false));
                        }

                        // Thought bubble
                        if (agent.thought && agent.thought !== '') {
                            thoughtBubble.setText(agent.thought);
                            thoughtBubble.setVisible(true);
                            this.time.delayedCall(6000, () => thoughtBubble.setVisible(false));
                        }

                        // --- SYSTEM LOG EVENT ---
                        if (agent.action !== lastAction || agent.thought !== '') {
                            eventBus.dispatchEvent(new CustomEvent('activity-log', {
                                detail: {
                                    agent: agent.name,
                                    action: agent.action,
                                    thought: agent.thought,
                                    time: new Date().toLocaleTimeString()
                                }
                            }));
                        }

                        lastAction = agent.action;
                        prevX = agent.x;
                        prevY = agent.y;
                    });
                });

                state.agents.onRemove((agent: AgentState, sessionId: string) => {
                    const sprite = this.agentSprites.get(sessionId);
                    if (sprite) {
                        sprite.destroy();
                        this.agentSprites.delete(sessionId);
                    }
                });
            });

        } catch (e) {
            console.error(e);
            this.statusText.setText('Colyseus Sync: Failed (Check Server)').setColor('#ffaaaa');
        }
    }

    update() {
        // If following an agent, smoothly track them
        if (this.followTarget) {
            const cam = this.cameras.main;
            const targetX = this.followTarget.x - cam.width / (2 * cam.zoom);
            const targetY = this.followTarget.y - cam.height / (2 * cam.zoom);
            cam.scrollX += (targetX - cam.scrollX) * 0.08;
            cam.scrollY += (targetY - cam.scrollY) * 0.08;
        } else {
            const speed = 5;
            if (this.cursors?.left.isDown) this.cameras.main.scrollX -= speed;
            if (this.cursors?.right.isDown) this.cameras.main.scrollX += speed;
            if (this.cursors?.up.isDown) this.cameras.main.scrollY -= speed;
            if (this.cursors?.down.isDown) this.cameras.main.scrollY += speed;
        }
    }
}

export function setupPhaser(parentId: string) {
    const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: parentId,
        width: window.innerWidth,
        height: window.innerHeight,
        scene: [OfficeScene],
        pixelArt: true,
        scale: {
            mode: Phaser.Scale.RESIZE,
        },
        input: {
            keyboard: {
                capture: [] // Don't capture ANY keys globally — let React inputs work
            }
        }
    };

    const game = new Phaser.Game(config);

    // When ANY input/textarea/select is focused, fully disable Phaser keyboard
    // When they blur, re-enable it
    document.addEventListener('focusin', (e) => {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
            game.input.keyboard?.enabled && (game.input.keyboard.enabled = false);
        }
    });
    document.addEventListener('focusout', (e) => {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
            game.input.keyboard && (game.input.keyboard.enabled = true);
        }
    });

    return game;
}
