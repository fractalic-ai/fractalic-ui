// types/node.ts
export type BaseNode = {
  id: number;
  title: string;
  promptText: string;
  wordWrap: boolean;
  showLineNumbers: boolean;
}

export type DefaultNode = BaseNode & {
  type: 'default';
}

export type OperationNode = BaseNode & {
  type: 'operation';
  selectedOperation: string;
  operationValues: Record<string, any>;
}

export type Node = DefaultNode | OperationNode;