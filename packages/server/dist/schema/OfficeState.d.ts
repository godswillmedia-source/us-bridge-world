import { Schema, MapSchema } from '@colyseus/schema';
export declare class AgentState extends Schema {
    id: string;
    name: string;
    x: number;
    y: number;
    direction: 'up' | 'down' | 'left' | 'right';
    action: string;
    currentTask: string;
    thought: string;
    spriteIndex: number;
    constructor(id: string, name: string);
}
export declare class OfficeState extends Schema {
    agents: MapSchema<AgentState, string>;
    officeTime: string;
    timeScale: number;
    createAgent(id: string, name: string): void;
    removeAgent(id: string): void;
}
//# sourceMappingURL=OfficeState.d.ts.map