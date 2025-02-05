import { operationSchema, type OperationType } from '../config/operationSchema';
import { generateYamlOperation, parseYamlOperation } from './yamlOperations';
import { type Node } from './types';

export const exportToMarkdown = (nodes: Node[]): string => {
  return nodes
    .map((node, index) => {
      let content = '';

      if (node.type === 'default') {
        content = `${node.title}\n${node.promptText || ''}`;
      } else if (node.type === 'operation') {
        let operationValues = { ...node.operationValues }; // Create a copy

        // Explicitly handle the use-header field
        if (operationValues && operationValues['use-header'] && typeof operationValues['use-header'] === 'string') {
          if (operationValues['use-header'].includes('#')) {
            operationValues['use-header'] = `"${operationValues['use-header']}"`; // Add double quotes
          }
        }

        content = generateYamlOperation(
          node.selectedOperation || '@import',
          operationValues // Use the modified copy
        );
      } else {
        return '';
      }

      let prefix = '';
      if (index > 0) {
        prefix = '\n';
      }

      let suffix = '';
      if (index < nodes.length - 1) {
        suffix = '\n';
      }

      return `${prefix}${content}${suffix}`;
    })
    .filter(Boolean)
    .join('');
};

export const importFromMarkdown = (content: string): Node[] => {
  const nodes: Node[] = [];
  let currentNode: Partial<Node> | null = null;
  let contentBuffer: string[] = [];
  let yamlBuffer: string[] = [];
  let isCollectingYaml = false;
  let lastLineEmpty = true;
  let isFirstLine = true;

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
      // Trim trailing empty lines ONLY for default nodes on import.
      while (contentBuffer.length > 0 && contentBuffer[contentBuffer.length - 1].trim() === '') {
        contentBuffer.pop();
      }
      currentNode.promptText = contentBuffer.join('\n');
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
    if (trimmedLine.length === 0) {
      if (isCollectingYaml) {
        yamlBuffer.push(line);
      } else {
        if (currentNode) {
          contentBuffer.push(line); // Correct: Always add if within a node
        }
      }
      lastLineEmpty = true;
      continue;
    }

    // Handle operation nodes.
    if (trimmedLine.startsWith('@') && (lastLineEmpty || isFirstLine)) {
      finalizeNode();
      currentNode = {
        id: Date.now() + i,
        type: 'operation',
        title: 'Operation',
      };
      isCollectingYaml = true;
      yamlBuffer.push(trimmedLine);
      lastLineEmpty = false;
      isFirstLine = false;
      continue;
    }

    // Handle heading nodes.
    if (trimmedLine.startsWith('#') && (lastLineEmpty || isFirstLine)) {
      finalizeNode();
      currentNode = {
        id: Date.now() + i,
        type: 'default',
        title: trimmedLine,
        promptText: '',
      };
      lastLineEmpty = false;
      isFirstLine = false;
      continue;
    }

    // Handle content
    if (isCollectingYaml) {
      yamlBuffer.push(line); // Add the ENTIRE line to yamlBuffer
    } else {
      if (!currentNode) {
        currentNode = {
          id: Date.now() + i,
          type: 'default',
          title: '',
          promptText: '',
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