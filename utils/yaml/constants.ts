export const YAML_PATTERNS = {
  TEMPLATE: /\{([^}]+)\}/g,
  SPECIAL_CHARS: /[:|>@\[\]{}]/,
  MULTILINE_MARKER: /^\s*\|\s*$/,
  COMMENT: /#[^\n]*/g,
  QUOTED_STRING: /"[^"]*"|'[^']*'/g
} as const;

export const YAML_FIELD_TYPES = {
  STRING: 'string',
  NUMBER: 'number',
  ENUM: 'enum',
  ARRAY: 'array',
  OBJECT: 'object',
  BOOLEAN: 'boolean'
} as const;

export const YAML_BLOCK_STYLES = {
  LITERAL: '|',
  FOLDED: '>',
  CLIP: '-',
  KEEP: '+',
  STRIP: '-'
} as const;