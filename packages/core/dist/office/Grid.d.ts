export interface Point {
    x: number;
    y: number;
}
export interface Rectangle {
    x: number;
    y: number;
    width: number;
    height: number;
}
export declare class Grid {
    width: number;
    height: number;
    tileSize: number;
    private collisionMap;
    private easystar;
    constructor(width: number, height: number, tileSize?: number);
    setCollision(x: number, y: number, isColliding: boolean): void;
    findPath(startX: number, startY: number, endX: number, endY: number): Promise<Point[]>;
    isWalkable(x: number, y: number): boolean;
}
//# sourceMappingURL=Grid.d.ts.map