import { logger } from './logger';
import { YAML_PATTERNS } from './constants';
import { type YamlFormatOptions, type YamlField } from './types';
import { operationSchema, type OperationType } from '../../config/operationSchema';
import { validateOperationType } from './validators';

export const sanitizeOperationValue = (value: any, field?: YamlField): any => {
  if (value === undefined || value === null) return '';

  if (typeof value === 'string') {
    if (value.includes('\n')) {
      return value; // Preserve multiline content exactly as is
    }

    if (YAML_PATTERNS.SPECIAL_CHARS.test(value)) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }

    return value;
  }

  return value;
};

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
      // Handle multiline strings with proper indentation
      if (value.includes('\n')) {
        const lines = value.split('\n');
        const indentation = ' '.repeat(indent);
        
        return `|\n${lines.map(line => `${indentation}${line}`).join('\n')}`;
      }

      // Handle strings with special characters
      if (/[:|>@\[\]{}]/.test(value)) {
        const quote = quotingStyle === 'single' ? "'" : '"';
        return `${quote}${value.replace(new RegExp(quote, 'g'), `\\${quote}`)}${quote}`;
      }

      return value;
    }

    // Handle other data types as needed...
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
  // The 'yaml' library does not have a direct equivalent for all js-yaml dump options.
  // We'll try to mimic similar behavior:
  // - lineWidth: -1 means no folding in 'js-yaml', 'yaml' allows setting lineWidth to Infinity or a large number.
  // - We cannot directly force literal style as 'js-yaml' did with '!!str': 'literal'.
  //   However, 'yaml' should preserve multiline strings as block scalars automatically if needed.
  // - We can use scalarOptions to ensure double quotes for strings.
  return {
    indent: 2,
    lineWidth: -1,
    scalarOptions: {
      // Force double quotes on strings to mimic forceQuotes + quotingType: '"'
      defaultStringType: "QUOTE_DOUBLE"
    }
  };
};

export const getYamlLoadOptions = () => {
  // The yaml library's parse function doesn't need schema or strict mode as js-yaml did.
  // If you need validation or strictness, you'll have to handle that after parsing.
  return {
    // no direct equivalents for schema, strict, or json
    // Add customTags or other parse options here if needed in the future.
  };
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
