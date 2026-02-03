/**
 * NLCI Logger
 *
 * Logging utility for the VS Code extension
 */

import * as vscode from 'vscode';

/**
 * Log levels
 */
export enum LogLevel {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
}

/**
 * Logger for the NLCI extension
 */
export class Logger {
  private static outputChannel: vscode.OutputChannel | undefined;
  private static level: LogLevel = LogLevel.Info;

  private readonly prefix: string;

  constructor(name: string) {
    this.prefix = `[${name}]`;

    // Create output channel lazily
    if (!Logger.outputChannel) {
      Logger.outputChannel = vscode.window.createOutputChannel('NLCI');
    }
  }

  /**
   * Set the global log level
   */
  static setLevel(level: LogLevel): void {
    Logger.level = level;
  }

  /**
   * Log a debug message
   */
  debug(message: string, ...args: unknown[]): void {
    if (Logger.level <= LogLevel.Debug) {
      this.log('DEBUG', message, args);
    }
  }

  /**
   * Log an info message
   */
  info(message: string, ...args: unknown[]): void {
    if (Logger.level <= LogLevel.Info) {
      this.log('INFO', message, args);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: unknown[]): void {
    if (Logger.level <= LogLevel.Warn) {
      this.log('WARN', message, args);
    }
  }

  /**
   * Log an error message
   */
  error(message: string, error?: unknown): void {
    if (Logger.level <= LogLevel.Error) {
      let errorMsg = message;
      if (error instanceof Error) {
        errorMsg += `: ${error.message}`;
        if (error.stack) {
          errorMsg += `\n${error.stack}`;
        }
      } else if (error) {
        errorMsg += `: ${String(error)}`;
      }
      this.log('ERROR', errorMsg, []);
    }
  }

  /**
   * Internal log method
   */
  private log(level: string, message: string, args: unknown[]): void {
    const timestamp = new Date().toISOString();
    let logMessage = `${timestamp} ${level} ${this.prefix} ${message}`;

    if (args.length > 0) {
      logMessage += ' ' + args.map((a) => JSON.stringify(a)).join(' ');
    }

    Logger.outputChannel?.appendLine(logMessage);

    // Also log to console in debug mode
    if (Logger.level === LogLevel.Debug) {
      console.log(logMessage);
    }
  }

  /**
   * Show the output channel
   */
  show(): void {
    Logger.outputChannel?.show();
  }
}
