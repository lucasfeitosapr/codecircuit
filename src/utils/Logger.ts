/**
 * Logger - Centralized logging utility with rate limiting and categorization
 *
 * Eliminates console spam while preserving useful debugging information
 *
 * Features:
 * - Rate limiting (prevent log spam)
 * - Log levels (DEBUG, INFO, WARN, ERROR)
 * - Categories (render, component, event, etc.)
 * - One-time logs (log once per session)
 * - Environment-aware (verbose in dev, quiet in prod)
 */

import { PerformanceConfig } from '../config/FeatureFlagAdapter';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export type LogCategory =
  | 'init'
  | 'render'
  | 'component'
  | 'connection'
  | 'event'
  | 'performance'
  | 'import-export'
  | 'navigation'
  | 'spatial'
  | 'error';

interface LogEntry {
  message: string;
  timestamp: number;
  count: number;
}

class LoggerImpl {
  private logLevel: LogLevel = LogLevel.INFO;
  private enabledCategories: Set<LogCategory> = new Set();
  private throttleMap: Map<string, LogEntry> = new Map();
  private onceMap: Set<string> = new Set();
  private throttleWindowMs: number = 1000; // 1 second window

  constructor() {
    // Initialize from config
    this.configure();
  }

  /**
   * Configure logger from performance config
   */
  configure(): void {
    const config = (PerformanceConfig as any).LOGGING;
    if (!config) return;

    // Set log level
    const levelMap: Record<string, LogLevel> = {
      'DEBUG': LogLevel.DEBUG,
      'INFO': LogLevel.INFO,
      'WARN': LogLevel.WARN,
      'ERROR': LogLevel.ERROR,
      'NONE': LogLevel.NONE,
    };
    this.logLevel = levelMap[config.LOG_LEVEL] ?? LogLevel.INFO;

    // Set enabled categories
    if (config.ENABLED_CATEGORIES) {
      this.enabledCategories = new Set(config.ENABLED_CATEGORIES);
    } else {
      // Default: all except debug categories
      this.enabledCategories = new Set([
        'init', 'error', 'warn', 'performance', 'import-export'
      ]);
    }

    // Set throttle rate
    if (config.THROTTLE_RATE_LIMIT) {
      this.throttleWindowMs = 1000 / config.THROTTLE_RATE_LIMIT;
    }
  }

  /**
   * Log at DEBUG level
   */
  debug(category: LogCategory, message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, category, message, ...args);
  }

  /**
   * Log at INFO level
   */
  info(category: LogCategory, message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, category, message, ...args);
  }

  /**
   * Log at WARN level
   */
  warn(category: LogCategory, message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, category, message, ...args);
  }

  /**
   * Log at ERROR level
   */
  error(category: LogCategory, message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, category, message, ...args);
  }

  /**
   * Log once per session (subsequent calls are ignored)
   */
  once(category: LogCategory, message: string, ...args: any[]): void {
    const key = `${category}:${message}`;
    if (this.onceMap.has(key)) return;

    this.onceMap.add(key);
    this.info(category, message, ...args);
  }

  /**
   * Log with throttling (max once per throttle window)
   */
  throttle(category: LogCategory, message: string, ...args: any[]): void {
    const key = `${category}:${message}`;
    const now = Date.now();
    const entry = this.throttleMap.get(key);

    if (entry) {
      const elapsed = now - entry.timestamp;
      if (elapsed < this.throttleWindowMs) {
        // Still within throttle window, increment count
        entry.count++;
        return;
      } else {
        // Throttle window expired, log with count if multiple attempts
        if (entry.count > 1) {
          this.info(category, `${message} (×${entry.count + 1})`, ...args);
        } else {
          this.info(category, message, ...args);
        }
        this.throttleMap.set(key, { message, timestamp: now, count: 0 });
      }
    } else {
      // First log for this message
      this.info(category, message, ...args);
      this.throttleMap.set(key, { message, timestamp: now, count: 0 });
    }
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, category: LogCategory, message: string, ...args: any[]): void {
    // Check if log level is enabled
    if (level < this.logLevel) return;

    // Check if category is enabled
    if (!this.enabledCategories.has(category) && level < LogLevel.WARN) {
      return;
    }

    // Format message with emoji prefix
    const prefix = this.getLevelPrefix(level, category);
    const formattedMessage = `${prefix} [${category}] ${message}`;

    // Output to console
    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(formattedMessage, ...args);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, ...args);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, ...args);
        break;
    }
  }

  /**
   * Get emoji prefix for log level and category
   */
  private getLevelPrefix(level: LogLevel, category: LogCategory): string {
    if (level === LogLevel.ERROR) return '❌';
    if (level === LogLevel.WARN) return '⚠️';

    // Category-specific emojis
    const categoryEmojis: Record<LogCategory, string> = {
      'init': '🚀',
      'render': '🎨',
      'component': '🧩',
      'connection': '⚡',
      'event': '📡',
      'performance': '⚡',
      'import-export': '💾',
      'navigation': '🧭',
      'spatial': '🗂️',
      'error': '❌',
    };

    return categoryEmojis[category] || '📝';
  }

  /**
   * Clear throttle and once maps (useful for testing)
   */
  reset(): void {
    this.throttleMap.clear();
    this.onceMap.clear();
  }

  /**
   * Get current configuration
   */
  getConfig(): { logLevel: LogLevel; enabledCategories: LogCategory[] } {
    return {
      logLevel: this.logLevel,
      enabledCategories: Array.from(this.enabledCategories),
    };
  }
}

// Singleton instance
export const logger = new LoggerImpl();
