"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfficeState = exports.AgentState = void 0;
const schema_1 = require("@colyseus/schema");
class AgentState extends schema_1.Schema {
    constructor(id, name) {
        super();
        this.id = id;
        this.name = name;
        this.x = 0;
        this.y = 0;
        this.direction = 'down';
        this.action = 'idle';
        this.currentTask = '';
        this.thought = '';
        this.spriteIndex = 0;
    }
}
exports.AgentState = AgentState;
__decorate([
    (0, schema_1.type)('string')
], AgentState.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)('string')
], AgentState.prototype, "name", void 0);
__decorate([
    (0, schema_1.type)('number')
], AgentState.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)('number')
], AgentState.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)('string')
], AgentState.prototype, "direction", void 0);
__decorate([
    (0, schema_1.type)('string')
], AgentState.prototype, "action", void 0);
__decorate([
    (0, schema_1.type)('string')
], AgentState.prototype, "currentTask", void 0);
__decorate([
    (0, schema_1.type)('string')
], AgentState.prototype, "thought", void 0);
__decorate([
    (0, schema_1.type)('number')
], AgentState.prototype, "spriteIndex", void 0);
class OfficeState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.agents = new schema_1.MapSchema();
        this.officeTime = new Date().toISOString();
        this.timeScale = 1;
    }
    createAgent(id, name) {
        this.agents.set(id, new AgentState(id, name));
    }
    removeAgent(id) {
        this.agents.delete(id);
    }
}
exports.OfficeState = OfficeState;
__decorate([
    (0, schema_1.type)({ map: AgentState })
], OfficeState.prototype, "agents", void 0);
__decorate([
    (0, schema_1.type)('string')
], OfficeState.prototype, "officeTime", void 0);
__decorate([
    (0, schema_1.type)('number')
], OfficeState.prototype, "timeScale", void 0);
//# sourceMappingURL=OfficeState.js.map