export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  run: (input: unknown) => Promise<unknown>;
}

export interface ToolRegistry {
  register(tool: ToolDefinition): void;
  get(name: string): ToolDefinition | undefined;
  list(): ToolDefinition[];
}

const tools = new Map<string, ToolDefinition>();

export const toolRegistry: ToolRegistry = {
  register(tool) {
    tools.set(tool.name, tool);
  },
  get(name) {
    return tools.get(name);
  },
  list() {
    return Array.from(tools.values());
  },
};

export * from './builtins';