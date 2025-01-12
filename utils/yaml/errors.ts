export class YamlParsingError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error,
    public readonly context?: string,
    public readonly data?: any
  ) {
    super(message);
    this.name = 'YamlParsingError';
  }
}

export class YamlValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: any,
    public readonly constraint?: string
  ) {
    super(message);
    this.name = 'YamlValidationError';
  }
}