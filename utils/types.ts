export interface Node {
  id: number;
  type: 'default' | 'operation';
  title: string;
  promptText: string;
  selectedOperation?: string;
  operationValues?: Record<string, any>;
}

export interface OperationState {
  [operation: string]: {
    values: Record<string, any>;
    activeFields: string[];
  };
}