import { AgentConfig, Memory, Task } from '@agent-office/core';
export declare class PromptBuilder {
    static buildSystemPrompt(agentConfig: AgentConfig, officeContext: {
        name: string;
        time: string;
    }, recentMemories: Memory[], currentTask?: Task): string;
}
//# sourceMappingURL=PromptBuilder.d.ts.map