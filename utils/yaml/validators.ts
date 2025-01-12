import { YAML_PATTERNS, YAML_FIELD_TYPES } from './constants';
import { type YamlField } from './types';
import { operationSchema, type OperationType } from '../../config/operationSchema';
import { logger } from './logger';

export const validateOperationType = (operation: string): operation is `@${OperationType}` => {
  const cleanOperation = operation.replace('@', '') as OperationType;
  return cleanOperation in operationSchema;
};

export const validateFieldStructure = (field: YamlField): boolean => {
  try {
    if (!field.name || !field.type) {
      return false;
    }

    if (field.type === YAML_FIELD_TYPES.ENUM && !Array.isArray(field.enum)) {
      return false;
    }

    if (field.type === YAML_FIELD_TYPES.NUMBER) {
      if (field.minimum !== undefined && typeof field.minimum !== 'number') {
        return false;
      }
      if (field.maximum !== undefined && typeof field.maximum !== 'number') {
        return false;
      }
      if (field.minimum !== undefined && field.maximum !== undefined && field.minimum > field.maximum) {
        return false;
      }
    }

    return true;
  } catch (e) {
    logger.error('Field structure validation failed', {
      context: 'validator',
      data: { field, error: e }
    });
    return false;
  }
};

export const validateFieldValue = (
  value: any,
  field: YamlField
): boolean => {
  try {
    if (field.required && (value === undefined || value === '')) {
      return false;
    }

    switch (field.type) {
      case YAML_FIELD_TYPES.STRING:
        return typeof value === 'string';

      case YAML_FIELD_TYPES.NUMBER:
        const num = Number(value);
        if (isNaN(num)) return false;
        if (field.minimum !== undefined && num < field.minimum) return false;
        if (field.maximum !== undefined && num > field.maximum) return false;
        return true;

      case YAML_FIELD_TYPES.ENUM:
        return field.enum?.includes(value) ?? false;

      case YAML_FIELD_TYPES.ARRAY:
        return Array.isArray(value);

      case YAML_FIELD_TYPES.BOOLEAN:
        return typeof value === 'boolean';

      case YAML_FIELD_TYPES.OBJECT:
        return typeof value === 'object' && value !== null && !Array.isArray(value);

      default:
        return true;
    }
  } catch (e) {
    logger.error('Field value validation failed', {
      context: 'validator',
      data: { value, field, error: e }
    });
    return false;
  }
};

export const validateYamlSyntax = (content: string): boolean => {
  try {
    // Check for unmatched quotes
    const quotes = content.match(/["']/g) || [];
    if (quotes.length % 2 !== 0) {
      return false;
    }

    // Check for valid multiline markers
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.trim().match(YAML_PATTERNS.MULTILINE_MARKER)) {
        const nextLine = lines[lines.indexOf(line) + 1];
        if (!nextLine || !nextLine.trim()) {
          return false;
        }
      }
    }

    // Check for valid template variables
    const templates = content.match(YAML_PATTERNS.TEMPLATE) || [];
    for (const template of templates) {
      if (!template.match(/^\{[^{}]+\}$/)) {
        return false;
      }
    }

    return true;
  } catch (e) {
    logger.error('YAML syntax validation failed', {
      context: 'validator',
      data: { content, error: e }
    });
    return false;
  }
};