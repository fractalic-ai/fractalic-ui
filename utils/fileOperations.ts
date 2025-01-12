import { operationSchema, type OperationType } from '../config/operationSchema';
import { generateYamlOperation, parseYamlOperation } from './yamlOperations';
import { type Node } from './types';

export const exportToMarkdown = (nodes: Node[]): string => {
  return nodes
    .map((node, index) => {
      if (node.type === 'default') {
        return `${node.title}\n${node.promptText || ''}\n`;
      } else if (node.type === 'operation') {
        const operation = node.selectedOperation?.replace('@', '') as OperationType;
        if (!operation || !operationSchema[operation]) return '';
        
        // Add empty lines before and after each operation block
        const yamlContent = generateYamlOperation(
          node.selectedOperation || '@import',
          node.operationValues || {}
        );
        // Always add newline before and after operation blocks
        return `\n${yamlContent}\n`;
      }
      return '';
    })
    .filter(Boolean)
    .join('\n');
};

export const importFromMarkdown = (content: string): Node[] => {
  const nodes: Node[] = [];
  let currentNode: Partial<Node> | null = null;
  let contentBuffer: string[] = [];
  let yamlBuffer: string[] = [];
  let isCollectingYaml = false;
  let lastLineEmpty = true; // Track empty lines
  let isFirstLine = true; // Track if we're at file start

  const finalizeNode = () => {
    if (!currentNode) return;

    if (currentNode.type === 'operation' && yamlBuffer.length > 0) {
      const { success, operation, values } = parseYamlOperation(yamlBuffer.join('\n'));
      if (success && operation) {
        currentNode.selectedOperation = operation;
        currentNode.operationValues = values;
      }
      yamlBuffer = [];
    } else if (currentNode.type === 'default') {
      currentNode.promptText = contentBuffer.join('\n').trim();
    }

    nodes.push(currentNode as Node);
    currentNode = null;
    contentBuffer = [];
    isCollectingYaml = false;
  };

  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Handle empty lines
    if (!trimmedLine) {
      if (isCollectingYaml && yamlBuffer.length > 0) {
        finalizeNode();
      }
      lastLineEmpty = true;
      isFirstLine = false;
      continue;
    }

    // Handle operation nodes
    if (trimmedLine.startsWith('@') && (lastLineEmpty || isFirstLine)) {
      finalizeNode();
      currentNode = {
        id: Date.now() + i,
        type: 'operation',
        title: 'Operation'
      };
      isCollectingYaml = true;
      yamlBuffer.push(trimmedLine);
      lastLineEmpty = false;
      isFirstLine = false;
      continue;
    }

    // Handle heading nodes - only if preceded by empty line or at file start
    if (trimmedLine.startsWith('#') && (lastLineEmpty || isFirstLine)) {
      finalizeNode();
      currentNode = {
        id: Date.now() + i,
        type: 'default',
        title: trimmedLine,
        promptText: ''
      };
      lastLineEmpty = false;
      isFirstLine = false;
      continue;
    }

    // Handle content
    if (currentNode?.type === 'default') {
      contentBuffer.push(line); // Keep original line with indentation
    } else if (isCollectingYaml) {
      yamlBuffer.push(line);
    } else if (trimmedLine && !isCollectingYaml) {
      // Handle content without a heading as regular text
      if (!currentNode) {
        currentNode = {
          id: Date.now() + i,
          type: 'default',
          title: '',
          promptText: ''
        };
      }
      contentBuffer.push(line);
    }
    lastLineEmpty = false;
    isFirstLine = false;
  }

  finalizeNode();
  return nodes;
};