import { parse } from 'yaml';
import { operationSchema, type OperationType } from '../../config/operationSchema';
import { validateFieldValue } from './validators';
import { getYamlLoadOptions } from './formatters';
import { sanitizeOperationValue } from './sanitizer';
import { logger } from './logger';
import { YamlParsingError, YamlValidationError } from './errors';

const preprocessYamlContent = (content: string): string => {
  try {
    const lines = content.split('\n');
    let inMultilineBlock = false;
    let blockIndentation = 0;

    return lines.map((line, index) => {
      const trimmedLine = line; // .trim();

      if (trimmedLine.endsWith('|')) {
        inMultilineBlock = true;
        blockIndentation = line.indexOf(':') + 2;
        return line;
      }

      if (inMultilineBlock) {
        // Preserve original indentation for multiline blocks
        return line;
      }

      return line;
    }).join('\n');
  } catch (e) {
    throw new YamlParsingError('Failed to preprocess YAML content', e as Error);
  }
};

export const parseYamlContent = (content: string) => {
  if (!content.trim()) {
    logger.warn('Empty YAML content', { context: 'parser' });
    return null;
  }

  try {
    const lines = content.split('\n');
    const operation = lines[0].trim();
    const yamlContent = lines.slice(1).join('\n');

    const preprocessed = preprocessYamlContent(yamlContent);
    logger.debug('Preprocessing YAML content', { 
      context: 'parser',
      data: { original: yamlContent, preprocessed } 
    });

    const options = {
      ...getYamlLoadOptions()
      // Remove schema-related options or others unsupported by 'yaml' if necessary
    };

    const result = parse(preprocessed, options) as Record<string, any>;
    
    if (!result) {
      throw new YamlParsingError('YAML content is empty or invalid');
    }

    return { operation, values: result };
  } catch (e) {
    if (e instanceof YamlParsingError) {
      throw e;
    }

    const error = new YamlParsingError(
      'Failed to parse YAML content',
      e as Error,
      'parser',
      { content }
    );
    
    logger.error(error.message, {
      context: error.context,
      data: error.data
    });

    return null;
  }
};

export const processFieldValue = (
  value: any,
  propertySchema: any,
  operation?: OperationType
): any => {
  if (value === undefined) {
    return propertySchema.default;
  }

  try {
    // Handle multiline strings
    if (typeof value === 'string' && value.includes('\n')) {
      return value.split('\n')
        .map(line => line)//line.trim())
        .filter(Boolean)
        .join('\n');
    }

    // Handle special case for prompt fields
    if (propertySchema.name === 'prompt' && typeof value === 'string') {
      return value.startsWith('|') ? value.substring(1).trim() : value;
    }

    // Sanitize and validate the value
    const sanitizedValue = sanitizeOperationValue(value, propertySchema);
    
    if (!validateFieldValue(sanitizedValue, propertySchema)) {
      throw new YamlValidationError(
        'Invalid field value',
        propertySchema.name,
        sanitizedValue,
        'validation'
      );
    }

    return sanitizedValue;
  } catch (e) {
    if (e instanceof YamlValidationError) {
      logger.warn(e.message, {
        context: 'validation',
        data: {
          field: e.field,
          value: e.value,
          constraint: e.constraint
        }
      });
    } else {
      logger.error('Failed to process field value', {
        context: 'processor',
        data: { value, schema: propertySchema }
      });
    }
    
    return propertySchema.default;
  }
};
