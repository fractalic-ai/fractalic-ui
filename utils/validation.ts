import { z } from 'zod';

// Common field validators
const pathValidator = z.string().regex(/^([\w-]+\/)*[\w.-]+$/, "Path must be in format 'file.ext' or 'folder/file.ext' with support for nested folders");
const blockPathValidator = z.string().regex(/^[\w-]+(\/[\w-]+)*(\*|\/\*)?$/, "Block path must be in format 'block' or 'block/subblock' with optional '*' for nested");
const blockPathNoNestedValidator = z.string().regex(/^[\w-]+(\/[\w-]+)*$/, "Block path cannot have nested flag '*'");
const headerValidator = z.string().min(1, "Header cannot be empty");
const modeValidator = z.enum(['append', 'prepend', 'replace']);
const booleanStringValidator = z.enum(['true', 'false']).transform(val => val === 'true');

// Media file validator
const mediaValidator = z.union([
  z.string().regex(/^([\w-]+\/)?[\w.-]+\.(jpg|jpeg|png|gif|mp4|mp3|wav|pdf)$/i, "Media file must have a valid extension"),
  z.array(z.string().regex(/^([\w-]+\/)?[\w.-]+\.(jpg|jpeg|png|gif|mp4|mp3|wav|pdf)$/i, "Media file must have a valid extension"))
]);

// Tools validator - clearer separation of types
const toolsValidator = z.union([
  // Special literal values (scalar)
  z.enum(['none', 'all']),
  // Array of tool names
  z.array(z.string().min(1, "Tool name cannot be empty")),
  // Single tool name (scalar)
  z.string().min(1, "Tool name cannot be empty")
]);

// Block reference validator (can be string or array)
const blockReferenceValidator = z.union([
  blockPathValidator,
  z.array(blockPathValidator)
]);

// LLM Operation Schema
export const llmOperationSchema = z.object({
  prompt: z.string().optional(),
  block: blockReferenceValidator.optional(),
  media: mediaValidator.optional(),
  'save-to-file': pathValidator.optional(),
  'use-header': z.union([z.literal('none'), headerValidator]).optional(),
  mode: modeValidator.optional(),
  to: blockPathValidator.optional(),
  provider: z.string().min(1, "Provider cannot be empty").optional(),
  model: z.string().min(1, "Model cannot be empty").optional(),
  temperature: z.number().min(0).max(1).optional(),
  'stop-sequences': z.array(z.string()).optional(),
  tools: toolsValidator.optional(),
  'tools-turns-max': z.number().min(1).optional(),
  'run-once': booleanStringValidator.optional(),
  context: z.enum(["auto", "none"]).optional()
}).refine(
  (data) => data.prompt || data.block,
  {
    message: "Either 'prompt' or 'block' must be provided",
    path: ["prompt", "block"]
  }
);

// Shell Operation Schema
export const shellOperationSchema = z.object({
  prompt: z.string().min(1, "Shell command cannot be empty"),
  'use-header': z.union([z.literal('none'), headerValidator]).optional(),
  mode: modeValidator.optional(),
  to: blockPathValidator.optional(),
  'run-once': booleanStringValidator.optional()
});

// Import Operation Schema
export const importOperationSchema = z.object({
  file: pathValidator,
  block: blockPathValidator.optional(),
  mode: modeValidator.optional(),
  to: blockPathValidator.optional(),
  'run-once': booleanStringValidator.optional()
});

// Run Operation Schema
export const runOperationSchema = z.object({
  file: pathValidator,
  prompt: z.string().optional(),
  block: blockReferenceValidator.optional(),
  'use-header': z.union([z.literal('none'), headerValidator]).optional(),
  mode: modeValidator.optional(),
  to: blockPathValidator.optional(),
  'run-once': booleanStringValidator.optional()
});

// Return Operation Schema
export const returnOperationSchema = z.object({
  prompt: z.string().optional(),
  block: blockReferenceValidator.optional(),
  'use-header': z.union([z.literal('none'), headerValidator]).optional()
}).refine(
  (data) => data.prompt || data.block,
  {
    message: "Either 'prompt' or 'block' must be provided",
    path: ["prompt", "block"]
  }
);

// Goto Operation Schema
export const gotoOperationSchema = z.object({
  block: blockPathNoNestedValidator,
  'run-once': booleanStringValidator.optional()
});

// Main operation validator
export const operationSchemas = {
  llm: llmOperationSchema,
  shell: shellOperationSchema,
  import: importOperationSchema,
  run: runOperationSchema,
  return: returnOperationSchema,
  goto: gotoOperationSchema
} as const;

export type OperationType = keyof typeof operationSchemas;

// Validation function
export function validateOperation(operation: OperationType, data: Record<string, any>) {
  const schema = operationSchemas[operation];
  return schema.safeParse(data);
}

// Error formatting helper
export function formatValidationErrors(errors: z.ZodError) {
  return errors.errors.map(error => ({
    field: error.path.join('.'),
    message: error.message,
    code: error.code
  }));
}

// YAML parsing helper with validation
export function parseAndValidateYAML(yamlContent: string, operation: OperationType) {
  try {
    // Simple YAML parsing (you might want to use a proper YAML parser)
    const lines = yamlContent.split('\n');
    const data: Record<string, any> = {};
    let currentKey = '';
    let currentArray: string[] = [];
    let inArray = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        
        // Handle array items (lines starting with -)
        if (trimmed.startsWith('- ')) {
          if (inArray && currentKey) {
            currentArray.push(trimmed.substring(2).trim());
          }
          continue;
        }
        
        // If we were in an array and hit a non-array line, finalize the array
        if (inArray && currentKey) {
          data[currentKey] = currentArray;
          currentArray = [];
          inArray = false;
          currentKey = '';
        }
        
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex > 0) {
          const key = trimmed.substring(0, colonIndex).trim();
          const value = trimmed.substring(colonIndex + 1).trim();
          
          // Handle empty values (field: with no value) - might be start of array
          if (value === '') {
            // Check if next non-empty line starts with -, indicating an array
            currentKey = key;
            inArray = true;
            currentArray = [];
            continue;
          }
          
          // Handle quoted strings
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            data[key] = value.slice(1, -1);
          } else if (value === 'true' || value === 'false') {
            data[key] = value;
          } else if (value === 'all' || value === 'none') {
            // Handle special literal values for tools field
            data[key] = value;
          } else if (!isNaN(Number(value))) {
            data[key] = Number(value);
          } else {
            data[key] = value;
          }
        }
      }
    }
    
    // Handle final array if we ended while in one
    if (inArray && currentKey && currentArray.length > 0) {
      data[currentKey] = currentArray;
    }
    
    return validateOperation(operation, data);
  } catch (error) {
    return {
      success: false,
      error: { message: `YAML parsing error: ${error}` }
    };
  }
}
