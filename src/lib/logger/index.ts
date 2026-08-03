import { ClientLogger } from "./client"
import type { LogCategory, LogConfig, LogContext, LogLevel } from "./types"

// Use client logger for both environments to avoid webpack warnings
// Server-specific features like file logging can be added via external tools
export const logger = ClientLogger.getInstance()

// Export types for use in other files
export type { LogCategory, LogConfig, LogContext, LogLevel }
