import { appendFileSync, existsSync, mkdirSync, renameSync, statSync, unlinkSync } from "node:fs"
import { basename, dirname, extname, join } from "node:path"
import type { LogCategory, LogConfig, LogContext, LogEntry, LogLevel } from "./types"

export class ServerLogger {
  private config: LogConfig
  private static instance: ServerLogger
  private logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
  }

  constructor() {
    this.config = this.getConfig()
  }

  static getInstance(): ServerLogger {
    if (!ServerLogger.instance) {
      ServerLogger.instance = new ServerLogger()
    }
    return ServerLogger.instance
  }

  private getConfig(): LogConfig {
    return {
      level:
        (process.env.LOG_LEVEL as LogLevel) ||
        (process.env.NODE_ENV === "production" ? "info" : "debug"),
      enabledCategories: process.env.LOG_CATEGORIES
        ? (process.env.LOG_CATEGORIES.split(",") as LogCategory[])
        : ["auth", "security", "api", "db", "email", "general", "performance"],
      enableConsole: process.env.LOG_CONSOLE !== "false",
      enableFile: process.env.LOG_FILE === "true",
      enableStructured: process.env.LOG_STRUCTURED !== "false",
      maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE || "10485760", 10), // 10MB
      maxFiles: parseInt(process.env.LOG_MAX_FILES || "5", 10),
      sensitiveFields: [
        "password",
        "token",
        "secret",
        "key",
        "authorization",
        "cookie",
        "smtpPassword",
        "apiKey",
        "accessToken",
        "refreshToken",
        "idToken",
        "sessionToken",
        "csrfToken",
        "passwordHash",
        "salt",
        ...(process.env.LOG_SENSITIVE_FIELDS?.split(",") || []),
      ],
    }
  }

  private shouldLog(level: LogLevel, category: LogCategory): boolean {
    // Check log level
    if (this.logLevels[level] < this.logLevels[this.config.level]) {
      return false
    }

    // Check category filter
    if (!this.config.enabledCategories.includes(category)) {
      return false
    }

    return true
  }

  private sanitizeData(data: unknown): unknown {
    if (typeof data === "string") {
      return this.sanitizeString(data)
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item))
    }

    if (data && typeof data === "object") {
      const sanitized: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase()
        if (this.config.sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
          sanitized[key] = "[REDACTED]"
        } else {
          sanitized[key] = this.sanitizeData(value)
        }
      }
      return sanitized
    }

    return data
  }

  private sanitizeString(str: string): string {
    return str
      .replace(/Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g, "Bearer [REDACTED]")
      .replace(/(?:password|token|key|secret)['":s]*['"]?([^'",s}]+)/gi, (match, value) =>
        match.replace(value, "[REDACTED]")
      )
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    const timestamp = new Date().toISOString()
    const category = context?.category || "general"

    return {
      level,
      message,
      timestamp,
      category,
      context: context ? (this.sanitizeData(context) as LogContext) : undefined,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
            cause: error.cause,
          }
        : undefined,
      pid: process.pid,
      hostname: process.env.HOSTNAME || "unknown",
      environment: process.env.NODE_ENV || "development",
    }
  }

  private formatConsoleOutput(entry: LogEntry): string {
    if (this.config.enableStructured) {
      return JSON.stringify(entry, null, process.env.NODE_ENV === "development" ? 2 : 0)
    }

    // Human-readable format for development
    const time = entry.timestamp.substring(11, 23) // Extract time part
    const levelColor = this.getLevelColor(entry.level)
    const categoryBadge = `[${entry.category.toUpperCase()}]`

    let output = `${levelColor}${time} ${entry.level.toUpperCase().padEnd(5)} ${categoryBadge} ${entry.message}\x1b[0m`

    if (entry.context && Object.keys(entry.context).length > 0) {
      output += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`
    }

    if (entry.error) {
      output += `\n  Error: ${entry.error.message}`
      if (entry.error.stack && process.env.NODE_ENV === "development") {
        output += `\n  Stack: ${entry.error.stack}`
      }
    }

    return output
  }

  private getLevelColor(level: LogLevel): string {
    const colors = {
      debug: "\x1b[36m", // Cyan
      info: "\x1b[32m", // Green
      warn: "\x1b[33m", // Yellow
      error: "\x1b[31m", // Red
      fatal: "\x1b[35m", // Magenta
    }
    return colors[level] || "\x1b[0m"
  }

  private writeToFile(entry: LogEntry) {
    if (!this.config.enableFile) {
      return
    }

    try {
      const logDir = join(process.cwd(), "logs")
      const logFile = join(logDir, `app-${new Date().toISOString().split("T")[0]}.log`)

      // Ensure log directory exists
      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true })
      }

      const logLine = `${JSON.stringify(entry)}\n`
      appendFileSync(logFile, logLine)

      // Basic file rotation
      const stats = statSync(logFile)
      if (stats.size > this.config.maxFileSize) {
        this.rotateLogFile(logFile)
      }
    } catch (error) {
      console.error("Failed to write to log file:", error)
    }
  }

  private rotateLogFile(currentFile: string) {
    try {
      const dir = dirname(currentFile)
      const ext = extname(currentFile)
      const base = basename(currentFile, ext)

      // Rotate existing files
      for (let i = this.config.maxFiles - 1; i > 0; i--) {
        const oldFile = join(dir, `${base}.${i}${ext}`)
        const newFile = join(dir, `${base}.${i + 1}${ext}`)

        if (existsSync(oldFile)) {
          if (i === this.config.maxFiles - 1) {
            unlinkSync(oldFile) // Delete oldest
          } else {
            renameSync(oldFile, newFile)
          }
        }
      }

      // Move current file to .1
      const rotatedFile = join(dir, `${base}.1${ext}`)
      renameSync(currentFile, rotatedFile)
    } catch (error) {
      console.error("Failed to rotate log file:", error)
    }
  }

  private async sendToExternalService(entry: LogEntry) {
    if (process.env.NODE_ENV === "production" && process.env.LOG_EXTERNAL_URL) {
      try {
        await fetch(process.env.LOG_EXTERNAL_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry),
        })
      } catch (error) {
        console.error("Failed to send log to external service:", error)
      }
    }
  }

  private async log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    const category = context?.category || "general"

    if (!this.shouldLog(level, category)) {
      return
    }

    const entry = this.createLogEntry(level, message, context, error)

    // Console output
    if (this.config.enableConsole) {
      const output = this.formatConsoleOutput(entry)

      switch (level) {
        case "fatal":
        case "error":
          console.error(output)
          break
        case "warn":
          console.warn(output)
          break
        case "debug":
          console.debug(output)
          break
        default:
          console.log(output)
      }
    }

    // Server-only features
    this.writeToFile(entry)
    await this.sendToExternalService(entry)
  }

  // Public logging methods
  debug(message: string, context?: LogContext) {
    this.log("debug", message, { ...context, category: context?.category || "general" })
  }

  info(message: string, context?: LogContext) {
    this.log("info", message, { ...context, category: context?.category || "general" })
  }

  warn(message: string, context?: LogContext) {
    this.log("warn", message, { ...context, category: context?.category || "general" })
  }

  error(message: string, context?: LogContext, error?: Error) {
    this.log("error", message, { ...context, category: context?.category || "general" }, error)
  }

  fatal(message: string, context?: LogContext, error?: Error) {
    this.log("fatal", message, { ...context, category: context?.category || "general" }, error)
  }

  // Category-specific methods
  auth(level: LogLevel, message: string, context?: Omit<LogContext, "category">, error?: Error) {
    this.log(level, `AUTH: ${message}`, { ...context, category: "auth" }, error)
  }

  security(
    level: LogLevel,
    message: string,
    context?: Omit<LogContext, "category">,
    error?: Error
  ) {
    this.log(level, `SECURITY: ${message}`, { ...context, category: "security" }, error)
  }

  api(level: LogLevel, message: string, context?: Omit<LogContext, "category">, error?: Error) {
    this.log(level, `API: ${message}`, { ...context, category: "api" }, error)
  }

  db(level: LogLevel, message: string, context?: Omit<LogContext, "category">, error?: Error) {
    this.log(level, `DB: ${message}`, { ...context, category: "db" }, error)
  }

  email(level: LogLevel, message: string, context?: Omit<LogContext, "category">, error?: Error) {
    this.log(level, `EMAIL: ${message}`, { ...context, category: "email" }, error)
  }

  performance(message: string, context?: Omit<LogContext, "category">) {
    this.log("info", `PERF: ${message}`, { ...context, category: "performance" })
  }

  // Backward compatibility methods
  securityEvent(event: string, context: LogContext) {
    this.security("warn", event, context)
  }

  authEvent(event: string, context: LogContext) {
    this.auth("info", event, context)
  }

  // Utility methods
  updateConfig(newConfig: Partial<LogConfig>) {
    this.config = { ...this.config, ...newConfig }
  }

  getCurrentConfig(): LogConfig {
    return { ...this.config }
  }

  // Performance measurement
  time(label: string, context?: LogContext): () => void {
    const start = performance.now()

    return () => {
      const end = performance.now()
      const duration = end - start
      this.performance(`${label} completed`, {
        ...context,
        duration: Math.round(duration * 100) / 100, // Round to 2 decimal places
      })
    }
  }
}
