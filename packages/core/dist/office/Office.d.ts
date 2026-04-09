import { Grid, Point, Rectangle } from './Grid';
export interface Room {
    id: string;
    name: string;
    bounds: Rectangle;
    type: 'workspace' | 'meeting' | 'social' | 'utility';
    capacity: number;
    ambientNoise: number;
    lighting: number;
}
export interface Furniture {
    id: string;
    type: string;
    bounds: Rectangle;
    interactionPoints: Point[];
}
export interface Zone {
    id: string;
    name: string;
    bounds: Rectangle;
    restricted: boolean;
}
export interface OfficeConfig {
    name: string;
    grid: {
        width: number;
        height: number;
        tileSize: number;
    };
    rooms: Room[];
    furniture: Furniture[];
    spawnPoints: Point[];
    zones: Zone[];
}
export declare class Office {
    config: OfficeConfig;
    grid: Grid;
    constructor(config: OfficeConfig);
    private initializeConstraints;
    getRoomAt(x: number, y: number): Room | undefined;
}
//# sourceMappingURL=Office.d.ts.map