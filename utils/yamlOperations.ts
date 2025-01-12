import { parse, stringify } from 'yaml';
import { operationSchema, type OperationType } from '../config/operationSchema';
import { logger } from './yaml/logger';
import { sanitizeOperationValue } from './yaml/sanitizer';
import { validateFieldValue, validateOperationType } from './yaml/validators';
import { type YamlParseResult } from './yaml/types';

export const generateYamlOperation = (operation: string, values: Record<string, any>): string => {
  const cleanOperation = operation.replace('@', '') as OperationType;
  if (!validateOperationType(operation)) return '';

  const yamlLines: string[] = [];
  
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === '') continue;
    
    // Handle arrays
    if (Array.isArray(value)) {
      yamlLines.push(`${key}:`);
      value.forEach(item => {
        if (typeof item === 'string' && item.includes('\n')) {
          // Handle multiline array items
          yamlLines.push(`  - |`);
          item.split('\n').forEach(line => {
            yamlLines.push(`    ${line}`);
          });
        } else {
          // Handle single line array items
          yamlLines.push(`  - ${sanitizeOperationValue(item)}`);
        }
      });
      continue;
    }
    
    // Handle multiline strings
    if (typeof value === 'string' && value.includes('\n')) {
      yamlLines.push(`${key}: |`);
      value.split('\n').forEach(line => {
        yamlLines.push(`  ${line}`);
      });
      continue;
    }
    
    // Handle regular values
    yamlLines.push(`${key}: ${sanitizeOperationValue(value)}`);
  }

  return `${operation}\n${yamlLines.join('\n')}`;
};

export const parseYamlOperation = (content: string): YamlParseResult => {
  try {
    const lines = content.split('\n');
    const operation = lines[0].trim();
    
    if (!validateOperationType(operation)) {
      throw new Error(`Invalid operation type: ${operation}`);
    }

    const cleanOperation = operation.replace('@', '') as OperationType;
    const schema = operationSchema[cleanOperation];
    
    // Handle YAML content with proper indentation
    const yamlLines = lines.slice(1).map(line => {
      const trimmed = line;
      if (!trimmed || trimmed.startsWith('#')) return '';
      
      // Handle multiline block indicators
      if (trimmed === '|' || trimmed === '>') {
        return line;
      }
      
      // Handle field declarations
      if (trimmed.includes(':')) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();
        
        // Keep original line if it's properly formatted
        if (!value || value === '|' || value === '>' || 
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          return line;
        }
        
        // Quote values with special characters
        if (/[:|>@\[\]{}]/.test(value)) {
          return `${key}: "${value.replace(/"/g, '\\"')}"`;
        }
        
        return line;
      }
      
      // Handle multiline content
      return line;
    }).filter(Boolean);

    // Parse YAML content using 'parse' from 'yaml'
    const yamlContent = yamlLines.join('\n');
    const parsedValues = parse(yamlContent) as Record<string, any>;

    const values: Record<string, any> = {};

    // Process each field according to schema
    Object.entries(schema.properties).forEach(([key, prop]) => {
      if (parsedValues?.[key] !== undefined) {
        let value = parsedValues[key];

        // Handle quoted strings
        if (typeof value === 'string') {
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          
          // Handle multiline strings
          if (value.includes('\n')) {
            value = value.split('\n')
              .map((line: string) => line)//line.trim())
              .filter((line: string) => Boolean(line))
              .join('\n');
          }
        }

        // Validate and sanitize the value
        if (validateFieldValue(value, prop)) {
          values[key] = value;
        } else if (prop.default !== undefined) {
          values[key] = prop.default;
        }
      } else if ((schema as any).required?.includes(key) && prop.default !== undefined) {
        values[key] = prop.default;
      }
    });

    return { success: true, operation, values };
  } catch (error) {
    logger.error('Failed to parse YAML operation', {
      context: 'parser',
      data: { content, error }
    });
    return { success: false, operation: '', values: {} };
  }
};
