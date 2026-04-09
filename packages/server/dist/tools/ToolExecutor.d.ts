export interface ToolResult {
    success: boolean;
    output: string;
    error?: string;
}
export declare class ToolExecutor {
    execute(toolName: string, params: any): Promise<ToolResult>;
    private executeCode;
    private webSearch;
    private writeNote;
    private readFile;
}
//# sourceMappingURL=ToolExecutor.d.ts.map