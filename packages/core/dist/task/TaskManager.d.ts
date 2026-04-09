export interface Deliverable {
    type: string;
    url?: string;
    content?: string;
}
export interface Task {
    id: string;
    title: string;
    description: string;
    type: 'coding' | 'writing' | 'research' | 'meeting' | 'review' | 'custom';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    estimatedDuration: number;
    requiredSkills: string[];
    dependencies: string[];
    creator?: string;
    assignee?: string;
    status: 'pending' | 'in_progress' | 'blocked' | 'completed';
    deliverable?: Deliverable;
}
export declare class TaskManager {
    private tasks;
    private generateId;
    createTask(task: Omit<Task, 'id' | 'status'>): Task;
    assignTask(taskId: string, agentId: string): void;
    getAgentQueue(agentId: string): Task[];
    updateTaskStatus(taskId: string, status: Task['status']): void;
    getTask(taskId: string): Task | undefined;
    evaluateCompletion(taskId: string): Promise<boolean>;
}
//# sourceMappingURL=TaskManager.d.ts.map