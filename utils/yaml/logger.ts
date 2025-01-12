type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogOptions {
  context?: string;
  data?: any;
}

class YamlLogger {
  private static instance: YamlLogger;
  private debugMode: boolean = false;

  private constructor() {}

  static getInstance(): YamlLogger {
    if (!YamlLogger.instance) {
      YamlLogger.instance = new YamlLogger();
    }
    return YamlLogger.instance;
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  private formatMessage(level: LogLevel, message: string, options?: LogOptions): string {
    const context = options?.context ? `[${options.context}] ` : '';
    return `${context}${message}`;
  }

  error(message: string, options?: LogOptions): void {
    const formattedMessage = this.formatMessage('error', message, options);
    console.error('YAML Error:', formattedMessage, options?.data || '');
  }

  warn(message: string, options?: LogOptions): void {
    const formattedMessage = this.formatMessage('warn', message, options);
    console.warn('YAML Warning:', formattedMessage, options?.data || '');
  }

  debug(message: string, options?: LogOptions): void {
    if (!this.debugMode) return;
    const formattedMessage = this.formatMessage('debug', message, options);
    console.debug('YAML Debug:', formattedMessage, options?.data || '');
  }
}

export const logger = YamlLogger.getInstance();