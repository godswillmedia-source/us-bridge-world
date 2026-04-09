"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Office = void 0;
const Grid_1 = require("./Grid");
class Office {
    constructor(config) {
        this.config = config;
        this.grid = new Grid_1.Grid(config.grid.width, config.grid.height, config.grid.tileSize);
        this.initializeConstraints();
    }
    initializeConstraints() {
        // Apply furniture collisions to the grid
        for (const item of this.config.furniture) {
            for (let y = item.bounds.y; y < item.bounds.y + item.bounds.height; y++) {
                for (let x = item.bounds.x; x < item.bounds.x + item.bounds.width; x++) {
                    this.grid.setCollision(x, y, true);
                }
            }
            // Assuming interaction points are walkable, free them up just in case
            for (const ip of item.interactionPoints) {
                this.grid.setCollision(ip.x, ip.y, false);
            }
        }
    }
    getRoomAt(x, y) {
        return this.config.rooms.find(r => x >= r.bounds.x && x < r.bounds.x + r.bounds.width &&
            y >= r.bounds.y && y < r.bounds.y + r.bounds.height);
    }
}
exports.Office = Office;
//# sourceMappingURL=Office.js.map