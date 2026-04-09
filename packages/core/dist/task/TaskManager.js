"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskManager = void 0;
class TaskManager {
    constructor() {
        this.tasks = new Map();
    }
    generateId() {
        return Math.random().toString(36).substring(2, 9);
    }
    createTask(task) {
        const newTask = {
            ...task,
            id: this.generateId(),
            status: 'pending',
        };
        this.tasks.set(newTask.id, newTask);
        return newTask;
    }
    assignTask(taskId, agentId) {
        const task = this.tasks.get(taskId);
        if (task) {
            task.assignee = agentId;
            if (task.status === 'pending') {
                task.status = 'in_progress';
            }
        }
    }
    getAgentQueue(agentId) {
        return Array.from(this.tasks.values())
            .filter(t => t.assignee === agentId)
            .sort((a, b) => {
            const priorityOrder = { urgent: 3, high: 2, medium: 1, low: 0 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }
    updateTaskStatus(taskId, status) {
        const task = this.tasks.get(taskId);
        if (task) {
            task.status = status;
        }
    }
    getTask(taskId) {
        return this.tasks.get(taskId);
    }
    async evaluateCompletion(taskId) {
        const task = this.tasks.get(taskId);
        if (!task)
            return false;
        // Abstract hook for future LLM-based evaluation
        return task.status === 'completed';
    }
}
exports.TaskManager = TaskManager;
//# sourceMappingURL=TaskManager.js.map