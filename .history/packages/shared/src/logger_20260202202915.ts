/**
 * @nlci/shared - Logger
 *
 * A simple, configurable logger for NLCI packages.
 */

/**
 * Log levels.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

/**
 * Log level priority (higher = more important).
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

/**
 * Logger configuration.
 */
export interface LoggerConfig {
  /** Minimum log level to display */
  level: LogLevel;

  /** Prefix for all messages */
  prefix?: string;

  /** Include timestamps */
  timestamps?: boolean;

  /** Custom output function */
  output?: (message: string) => void;
}

/**
 * Default logger configuration.
 */
const DEFAULT_CONFIG: LoggerConfig = {
  level: 'info',
  prefix: 'nlci',
  timestamps: false,
  output: console.log,
};

/**
 * A simple logger.
 */
export class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Sets the log level.
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Logs a debug message.
   */
  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, ...args);
  }

  /**
   * Logs an info message.
   */
  info(message: string, ...args: unknown[]): void {
    this.log('info', message, ...args);
  }

  /**
   * Logs a warning message.
   */
  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, ...args);
  }

  /**
   * Logs an error message.
   */
  error(message: string, ...args: unknown[]): void {
    this.log('error', message, ...args);
  }

  /**
   * Creates a child logger with a new prefix.
   */
  child(prefix: string): Logger {
    return new Logger({
      ...this.config,
      prefix: this.config.prefix
        ? `${this.config.prefix}:${prefix}`
        : prefix,
    });
  }

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.level]) {
      return;
    }

    const parts: string[] = [];

    // Timestamp
    if (this.config.timestamps) {
      parts.push(`[${new Date().toISOString()}]`);
    }

    // Level
    parts.push(`[${level.toUpperCase()}]`);

    // Prefix
    if (this.config.prefix) {
      parts.push(`[${this.config.prefix}]`);
    }

    // Message
    parts.push(message);

    // Format args
    const formatted = parts.join(' ');
    const output = this.config.output ?? console.log;

    if (args.length > 0) {
      output(formatted, ...args);
    } else {
      output(formatted);
    }
  }
}

/**
 * Default logger instance.
 */
export const logger = new Logger();

/**
 * Creates a new logger with the given configuration.
 */
export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}
