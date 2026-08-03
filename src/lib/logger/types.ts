export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal"
export type LogCategory = "auth" | "security" | "api" | "db" | "email" | "general" | "performance"

export interface LogConfig {
  level: LogLevel
  enabledCategories: LogCategory[]
  enableConsole: boolean
  enableFile: boolean
  enableStructured: boolean
  maxFileSize: number
  maxFiles: number
  sensitiveFields: string[]
}

export interface LogContext {
  userId?: string
  action?: string
  resource?: string
  ip?: string
  userAgent?: string
  requestId?: string
  duration?: number
  category?: LogCategory
  timestamp?: string
  [key: string]: unknown
}

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  category: LogCategory
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
    cause?: unknown
  }
  pid: number
  hostname: string
  environment: string
}
