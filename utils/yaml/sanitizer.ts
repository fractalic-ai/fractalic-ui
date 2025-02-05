import { logger } from './logger';
import { YAML_PATTERNS, YAML_FIELD_TYPES, YAML_BLOCK_STYLES } from './constants';
import { type YamlFormatOptions, type YamlField } from './types';
import { operationSchema, type OperationType } from '../../config/operationSchema';
import { validateOperationType } from './validators';

// Modified sanitizeOperationValue:  Be more specific about what needs quoting.
export const sanitizeOperationValue = (value: any, field?: YamlField): any => {
  if (value === undefined || value === null) return '';

  if (typeof value === 'string') {
    if (value.includes('\n')) {
      return value; // Preserve multiline content
    }

    // Only quote if it starts like a comment.
    if (/^#\s/.test(value)) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }

  return value;
};

// Modified formatYamlValue:  Correctly handle strings that look like comments.
export const formatYamlValue = (
  value: any,
  options: YamlFormatOptions = {}
): string => {
  const {
    indent = 2,
    quotingStyle = 'double'
  } = options;

  try {
    if (typeof value === 'string') {
      if (value.includes('\n')) {
        const lines = value.split('\n');
        const indentation = ' '.repeat(indent);
        return `|\n${lines.map(line => `${indentation}${line}`).join('\n')}`;
      }

      // Use a COMBINED regex: Starts like a comment OR contains special chars
      if (/^#\s/.test(value) || YAML_PATTERNS.SPECIAL_CHARS.test(value)) {
        const quote = quotingStyle === 'single' ? "'" : '"';
        return `${quote}${value.replace(new RegExp(quote, 'g'), `\\${quote}`)}${quote}`;
      }

      return value;
    }
    return String(value);
  } catch (e) {
    logger.error('Failed to format YAML value', {
      context: 'formatter',
      data: { value, options, error: e }
    });
    return String(value);
  }
};

export const getYamlDumpOptions = () => {
  return {
    indent: 2,
    lineWidth: -1,
    scalarOptions: {
      defaultStringType: "QUOTE_DOUBLE"
    }
  };
};

export const getYamlLoadOptions = () => {
  return {};
};

export const generateYamlOperation = (operation: string, values: Record<string, any>): string => {
  const cleanOperation = operation.replace('@', '') as OperationType;
  if (!validateOperationType(operation)) return '';

  const operationObj = Object.entries(values)
    .filter(([_, value]) => value !== undefined && value !== '')
    .map(([key, value]) => {
      const formattedValue = formatYamlValue(sanitizeOperationValue(value));
      return `${key}: ${formattedValue}`;
    })
    .join('\n');

  return `${operation}\n${operationObj}`;
};