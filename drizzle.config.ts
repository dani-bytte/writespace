import * as dotenv from "dotenv"
import { defineConfig } from "drizzle-kit"

// Carregar variáveis de ambiente do .env.local
dotenv.config({ path: ".env.local" })

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL não encontrada no .env.local")
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./migrations",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
})
