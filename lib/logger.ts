// lib/logger.ts - Production-Safe Logging Utility
"use client"

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

interface LogConfig {
  level: LogLevel
  enableInProduction: boolean
  sensitiveFields: string[]
  maxLogSize: number
}

class Logger {
  private config: LogConfig
  private logBuffer: string[] = []
  private readonly MAX_BUFFER_SIZE = 100

  constructor() {
    this.config = {
      level: process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG,
      enableInProduction: process.env.NEXT_PUBLIC_ENABLE_LOGGING === 'true',
      sensitiveFields: ['password', 'token', 'secret', 'key', 'email', 'phone'],
      maxLogSize: 1000
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (process.env.NODE_ENV === 'production' && !this.config.enableInProduction) {
      return level >= LogLevel.ERROR // Only errors in production
    }
    return level >= this.config.level
  }

  private sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) return data

    const sanitized = Array.isArray(data) ? [...data] : { ...data }

    for (const [key, value] of Object.entries(sanitized)) {
      const lowerKey = key.toLowerCase()
      const isSensitive = this.config.sensitiveFields.some(field => 
        lowerKey.includes(field.toLowerCase())
      )

      if (isSensitive) {
        sanitized[key] = '[REDACTED]'
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value)
      }
    }

    return sanitized
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString()
    const levelStr = LogLevel[level]
    const prefix = `[${timestamp}] [${levelStr}]`
    
    let logMessage = `${prefix} ${message}`
    
    if (data !== undefined) {
      const sanitizedData = this.sanitizeData(data)
      const dataStr = JSON.stringify(sanitizedData)
      
      // Truncate if too long
      if (dataStr.length > this.config.maxLogSize) {
        logMessage += ` ${dataStr.substring(0, this.config.maxLogSize)}...[TRUNCATED]`
      } else {
        logMessage += ` ${dataStr}`
      }
    }

    return logMessage
  }

  private addToBuffer(message: string) {
    this.logBuffer.push(message)
    if (this.logBuffer.length > this.MAX_BUFFER_SIZE) {
      this.logBuffer.shift()
    }
  }

  debug(message: string, data?: any) {
    if (!this.shouldLog(LogLevel.DEBUG)) return
    
    const formattedMessage = this.formatMessage(LogLevel.DEBUG, message, data)
    this.addToBuffer(formattedMessage)
    console.debug(formattedMessage)
  }

  info(message: string, data?: any) {
    if (!this.shouldLog(LogLevel.INFO)) return
    
    const formattedMessage = this.formatMessage(LogLevel.INFO, message, data)
    this.addToBuffer(formattedMessage)
    console.info(formattedMessage)
  }

  warn(message: string, data?: any) {
    if (!this.shouldLog(LogLevel.WARN)) return
    
    const formattedMessage = this.formatMessage(LogLevel.WARN, message, data)
    this.addToBuffer(formattedMessage)
    console.warn(formattedMessage)
  }

  error(message: string, data?: any, error?: Error) {
    if (!this.shouldLog(LogLevel.ERROR)) return
    
    let errorData = data
    if (error) {
      errorData = {
        ...data,
        error: {
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : '[REDACTED]',
          name: error.name
        }
      }
    }

    const formattedMessage = this.formatMessage(LogLevel.ERROR, message, errorData)
    this.addToBuffer(formattedMessage)
    console.error(formattedMessage)

    // In production, you might want to send this to an error tracking service
    if (process.env.NODE_ENV === 'production') {
      this.sendToErrorTracking(formattedMessage, error)
    }
  }

  private sendToErrorTracking(message: string, error?: Error) {
    // Implement error tracking service integration here
    // e.g., Sentry, LogRocket, etc.
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: message,
        fatal: false
      })
    }
  }

  // Get recent logs for debugging
  getLogs(): string[] {
    return [...this.logBuffer]
  }

  // Clear log buffer
  clearLogs() {
    this.logBuffer = []
  }

  // Performance logging
  time(label: string) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.time(label)
    }
  }

  timeEnd(label: string) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.timeEnd(label)
    }
  }

  // Group logging
  group(label: string) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.group(label)
    }
  }

  groupEnd() {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.groupEnd()
    }
  }
}

// Create singleton instance
const logger = new Logger()

// Export logger instance and convenience functions
export { logger }

// Convenience exports for common logging patterns
export const log = {
  debug: (message: string, data?: any) => logger.debug(message, data),
  info: (message: string, data?: any) => logger.info(message, data),
  warn: (message: string, data?: any) => logger.warn(message, data),
  error: (message: string, data?: any, error?: Error) => logger.error(message, data, error),
  time: (label: string) => logger.time(label),
  timeEnd: (label: string) => logger.timeEnd(label),
  group: (label: string) => logger.group(label),
  groupEnd: () => logger.groupEnd()
}

// React Hook for component logging
export function useLogger(componentName: string) {
  return {
    debug: (message: string, data?: any) => 
      logger.debug(`[${componentName}] ${message}`, data),
    info: (message: string, data?: any) => 
      logger.info(`[${componentName}] ${message}`, data),
    warn: (message: string, data?: any) => 
      logger.warn(`[${componentName}] ${message}`, data),
    error: (message: string, data?: any, error?: Error) => 
      logger.error(`[${componentName}] ${message}`, data, error)
  }
}

export default logger 