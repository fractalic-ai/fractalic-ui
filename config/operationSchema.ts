import { z } from 'zod';

// Common field processors 
const processors = {
  path: z.object({
    folder: z.string(),
    file: z.string()
  }),

  blockPath: z.object({
    block: z.string(),
    nested_flag: z.boolean().optional()  
  }),

  blockPathNoNested: z.object({
    block: z.string()
  }),

  filePath: z.object({
    folder: z.string(),
    file: z.string()
  })
};

// Operation schema
export const operationSchema = {
  import: {
    description: "Import content from another file or block",
    required: ["file"],
    properties: {
      file: {
        type: 'string',
        xProcess: 'path',
        description: "Source path: folder/file.md"
      },
      block: {
        type: 'string', 
        xProcess: 'block-path',
        description: "Source block path: block/subblock/* where /* is optional for nested blocks"
      },
      mode: {
        type: 'enum',
        enum: ['append', 'prepend', 'replace'],
        default: 'append',
        description: "How to insert content: append, prepend, replace"
      },
      to: {
        type: 'string',
        xProcess: 'block-path', 
        description: "Target block path where content will be placed, supports nested flag"
      }
    }
  },

  llm: {
    description: "Execute LLM model with prompt and handle response",
    properties: {
      prompt: {
        type: 'string',
        description: "Literal text in quotes or multiline or block reference"
      },
      block: {
        type: ['string', 'array'],
        xProcess: 'block-path',
        description: "Block reference to use as prompt. Can be used as collection of blocks."
      },
      media: {
        type: ['string', 'array'],
        xProcess: 'file-path',
        description: "Path to media file to add with context or prompt: folder/image.png"
      },
      "save-to-file": {
        type: "string",
        xProcess: "file-path",
        description: "Path to file where LLM response will be saved"
      },
      'use-header': {
        type: 'string',
        description: "Optional header for the block that will contain LLM response. Set to 'none' to omit header. If contains {id=X}, creates block with that ID"
      },
      mode: {
        type: 'enum',
        enum: ['append', 'prepend', 'replace'],
        default: 'append',
        description: "How to insert LLM response into target block"
      },
      to: {
        type: 'string',
        xProcess: 'block-path',
        description: "Target block where LLM response will be placed"
      },
      provider: {
        type: 'string',
        description: "Optional LLM provider to override the default setting."
      },
      model: {
        type: 'string',
        description: "Optional model to override the default setting."
      },
      temperature: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: "Optional temperature setting for LLM call to control randomness."
      }
    },
    anyOf: [
      { required: ["prompt"] },
      { required: ["block"] }
    ]
  },

  run: {
    description: "Execute another markdown file as a workflow",
    required: ["file"],
    properties: {
      file: {
        type: 'string',
        xProcess: 'file-path',
        description: "Path to markdown file to execute: folder/file.md"
      },
      prompt: {
        type: 'string',
        description: "Optional input text or block reference to pass to the executed file"
      },
      block: {
        type: ['string', 'array'],
        xProcess: 'block-path',
        description: "Blocks references to use alone or in combination with prompt"
      },
      'use-header': {
        type: 'string',
        description: "If provided - with prompt, header would be appended with prompt content to target file before execution. Set to 'none' to omit header"
      },
      mode: {
        type: 'enum',
        enum: ['append', 'prepend', 'replace'],
        default: 'append',
        description: "How to insert execution results"
      },
      to: {
        type: 'string',
        xProcess: 'block-path',
        description: "Target block where execution results will be placed"
      }
    }
  },

  shell: {
    description: "Execute shell command and capture output",
    required: ["prompt"],
    properties: {
      prompt: {
        type: 'string',
        description: "Shell command to execute (single line or multiline)"
      },
      'use-header': {
        type: 'string',
        default: "# OS Shell Tool response block",
        description: "Optional header for the block that will contain command output. Set to 'none' to omit header. Otherwise replaces default header"
      },
      mode: {
        type: 'enum',
        enum: ['append', 'prepend', 'replace'],
        default: 'append',
        description: "How to insert command output"
      },
      to: {
        type: 'string',
        xProcess: 'block-path',
        description: "Target block where command output will be placed"
      }
    }
  },

  return: {
    description: "Return content and terminate execution",
    properties: {
      prompt: {
        type: 'string',
        description: "Literal text to return"
      },
      block: {
        type: ['string', 'array'],
        xProcess: 'block-path',
        description: "Blocks references to use with or without prompt"
      },
      'use-header': {
        type: 'string',
        description: "Optional header for returned prompt. Set to 'none' to omit header. Otherwise overwrites default"
      }
    },
    anyOf: [
      { required: ["prompt"] },
      { required: ["block"] }
    ]
  },

  goto: {
    description: "Navigate to another block in document",
    required: ["block"],
    properties: {
      block: {
        type: 'string',
        xProcess: 'block-path-no-nested',
        description: "Target block to navigate to (no nested flags allowed)"
      }
    }
  }
} as const;

export type OperationType = keyof typeof operationSchema;
export type OperationProperty<T extends OperationType> = keyof typeof operationSchema[T]['properties'];

export const getOperationProperties = <T extends OperationType>(operation: T) => {
  return operationSchema[operation].properties;
};

export const getRequiredFields = <T extends OperationType>(operation: T) => {
  return (operationSchema[operation] as { required?: readonly string[] }).required ?? [];
};

export const getOperationDescription = <T extends OperationType>(operation: T) => {
  return operationSchema[operation].description;
};