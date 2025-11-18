/**
 * Production-ready logging utility
 * Replaces console statements with environment-aware logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  private formatMessage(level: LogLevel, message: string, data?: unknown): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true;
    
    // In production, only log warnings and errors
    if (this.isProduction) {
      return level === 'warn' || level === 'error';
    }
    
    return true;
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) return;

    const entry = this.formatMessage(level, message, data);

    switch (level) {
      case 'debug':
        if (this.isDevelopment) {
          console.debug(`[DEBUG] ${entry.message}`, data || '');
        }
        break;
      case 'info':
        if (this.isDevelopment) {
          console.info(`[INFO] ${entry.message}`, data || '');
        }
        break;
      case 'warn':
        console.warn(`[WARN] ${entry.message}`, data || '');
        // In production, you might want to send to error tracking service
        break;
      case 'error':
        console.error(`[ERROR] ${entry.message}`, data || '');
        // In production, send to error tracking service (e.g., Sentry)
        if (this.isProduction && typeof window !== 'undefined') {
          // Sentry integration - uncomment when Sentry is configured
          // if (typeof window !== 'undefined' && (window as any).Sentry) {
          //   (window as any).Sentry.captureException(new Error(message), { extra: data });
          // }
        }
        break;
    }
  }

  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown): void {
    this.log('error', message, data);
  }

  // Convenience methods for common patterns
  logError(error: Error, context?: Record<string, unknown>): void {
    this.error(error.message, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...context,
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export type for use in other files
export type { LogLevel };

