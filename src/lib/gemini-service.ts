import {
  type GenerateContentResult,
  type GenerativeModel,
  GoogleGenerativeAI,
} from "@google/generative-ai"
import { logger } from "@/src/lib/logger"
import type { SpotifyTrack } from "@/src/lib/spotify-service"

// Types para o serviço
export interface TrackForAnalysis {
  id: string
  name: string
  artists: string[]
  album: string
}

export interface RefinedPlaylistResult {
  /** Tracks que devem permanecer na playlist */
  keptTracks: TrackForAnalysis[]
  /** Tracks removidas como duplicatas/variações */
  removedTracks: {
    track: TrackForAnalysis
    reason: string
    originalTrack?: string // Nome da track original que essa é variação
  }[]
  /** Sugestões e observações do Gemini */
  suggestions?: string
}

export interface PlaylistNameSuggestion {
  names: string[]
  reasoning: string
}

// Rate limiting configuration for gemini-2.5-flash-lite
// FREE TIER: 20 requests per day, 15 requests per minute, 32k tokens per minute
// PAID TIER: 1000+ requests per day, much higher RPM
const RATE_LIMITS_FREE = {
  RPM: 10, // 10 requests per minute (API enforces 15, being conservative)
  TPM: 30000, // 30k tokens per minute (API enforces 32k, being conservative)
  RPD: 15, // 15 requests per day (API enforces 20 hard limit, we stop at 15 to avoid 429s)
  MIN_REQUEST_INTERVAL: 6000, // Mínimo 6 segundos entre requests
}

const RATE_LIMITS_PAID = {
  RPM: 100, // 100 requests per minute (very permissive for paid tier)
  TPM: 1000000, // 1M tokens per minute (very permissive for paid tier)
  RPD: 1000, // 1000 requests per day (very permissive for paid tier)
  MIN_REQUEST_INTERVAL: 100, // 100ms entre requests
}

// API Key configuration for fallback
interface ApiKeyConfig {
  key: string
  name: string
  isBackup: boolean
  failureCount: number
  lastError?: string
  lastErrorTime?: number
  isPaid?: boolean
  isValid?: boolean
}

// Helper function to validate Gemini API key format
function isValidGeminiApiKey(key: string): boolean {
  // Valid Gemini keys start with 'AIza'
  return typeof key === "string" && key.length > 0 && key.startsWith("AIza")
}
// Rate limiter state
interface RateLimiterState {
  requestsThisMinute: number
  requestsToday: number
  tokensThisMinute: number
  minuteStartTime: number
  dayStartTime: number
  lastRequestTime: number
}

class GeminiService {
  private client: GoogleGenerativeAI | null = null
  private modelName = "gemini-2.5-flash-lite"

  // API Key management with fallback
  private apiKeys: ApiKeyConfig[] = []
  private currentKeyIndex = 0

  // Rate limiter state
  private rateLimiter: RateLimiterState = {
    requestsThisMinute: 0,
    requestsToday: 0,
    tokensThisMinute: 0,
    minuteStartTime: Date.now(),
    dayStartTime: this.getStartOfDay(),
    lastRequestTime: 0,
  }

  constructor() {
    this.initializeApiKeys()
  }

  /**
   * Initialize API keys with fallback support
   */
  private initializeApiKeys(): void {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      logger.warn("⚠️ GEMINI_API_KEY não configurada. Refinamento desativado.")
      return
    }

    const isValid = isValidGeminiApiKey(apiKey)
    if (!isValid) {
      logger.warn("⚠️ GEMINI_API_KEY inválida - deve começar com 'AIza'")
    }

    this.apiKeys = [
      {
        key: apiKey,
        name: "GEMINI_API_KEY",
        isBackup: false,
        failureCount: 0,
        isValid,
      },
    ]

    logger.info("✅ Gemini API Key configurada", { isValid })
  }

  /**
   * Get current API key with automatic fallback
   */
  private getCurrentApiKey(): string | null {
    if (this.apiKeys.length === 0) {
      return null
    }

    // If current key failed too many times, rotate to next
    const currentKey = this.apiKeys[this.currentKeyIndex]
    if (currentKey.failureCount >= 3) {
      logger.warn("Chave API com muitas falhas, tentando fallback", {
        failedKey: currentKey.name,
        failureCount: currentKey.failureCount,
      })
      this.rotateApiKey()
    }

    return this.apiKeys[this.currentKeyIndex].key
  }

  /**
   * Rotate to next API key
   */
  private rotateApiKey(): void {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length

    logger.info("🔄 API Key rotacionada", {
      newKey: this.apiKeys[this.currentKeyIndex].name,
      failureCount: this.apiKeys[this.currentKeyIndex].failureCount,
    })

    // Recreate client with new key
    this.client = null

    // Reset rate limiter for new key (cada chave tem limites independentes)
    this.rateLimiter.requestsThisMinute = 0
    this.rateLimiter.tokensThisMinute = 0
    this.rateLimiter.minuteStartTime = Date.now()
  }

  /**
   * Record API key success (reset failure counter)
   */
  private recordApiKeySuccess(): void {
    const currentKey = this.apiKeys[this.currentKeyIndex]
    if (currentKey && currentKey.failureCount > 0) {
      currentKey.failureCount = 0
      logger.info("Sucesso registrado, contador resetado", {
        key: currentKey.name,
      })
    }
  }

  private getStartOfDay(): number {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  }

  private resetMinuteCountersIfNeeded(): void {
    const now = Date.now()
    if (now - this.rateLimiter.minuteStartTime >= 60000) {
      this.rateLimiter.requestsThisMinute = 0
      this.rateLimiter.tokensThisMinute = 0
      this.rateLimiter.minuteStartTime = now
    }
  }

  private resetDayCountersIfNeeded(): void {
    const startOfToday = this.getStartOfDay()
    if (this.rateLimiter.dayStartTime < startOfToday) {
      this.rateLimiter.requestsToday = 0
      this.rateLimiter.dayStartTime = startOfToday
    }
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  private getRateLimits() {
    const currentKey = this.apiKeys[this.currentKeyIndex]
    if (currentKey?.isValid) {
      return RATE_LIMITS_PAID
    }
    return RATE_LIMITS_FREE
  }

  private async waitForRateLimit(_estimatedTokens: number): Promise<void> {
    const limits = this.getRateLimits()
    this.resetMinuteCountersIfNeeded()
    this.resetDayCountersIfNeeded()

    if (this.rateLimiter.requestsToday >= limits.RPD) {
      const hoursUntilReset = Math.ceil((this.getStartOfDay() + 86400000 - Date.now()) / 3600000)
      throw new Error(
        `Limite diário de requests atingido. Tente novamente em ${hoursUntilReset} horas.`
      )
    }

    if (this.rateLimiter.requestsThisMinute >= limits.RPM) {
      const waitTime = 60000 - (Date.now() - this.rateLimiter.minuteStartTime)
      if (waitTime > 0) {
        await this.delay(waitTime)
        this.resetMinuteCountersIfNeeded()
      }
    }

    const timeSinceLastRequest = Date.now() - this.rateLimiter.lastRequestTime
    if (timeSinceLastRequest < limits.MIN_REQUEST_INTERVAL) {
      await this.delay(limits.MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    }
  }

  private recordRequest(estimatedTokens: number): void {
    this.rateLimiter.requestsThisMinute++
    this.rateLimiter.requestsToday++
    this.rateLimiter.tokensThisMinute += estimatedTokens
    this.rateLimiter.lastRequestTime = Date.now()
  }

  getRateLimitStatus() {
    const limits = this.getRateLimits()
    this.resetMinuteCountersIfNeeded()
    this.resetDayCountersIfNeeded()

    return {
      requestsThisMinute: this.rateLimiter.requestsThisMinute,
      requestsToday: this.rateLimiter.requestsToday,
      tokensThisMinute: this.rateLimiter.tokensThisMinute,
      limits,
      canMakeRequest:
        this.rateLimiter.requestsToday < limits.RPD &&
        this.rateLimiter.requestsThisMinute < limits.RPM,
    }
  }

  isQuotaExhausted(): boolean {
    if (this.apiKeys.length === 0) {
      return true
    }
    return this.apiKeys.every(k => k.failureCount >= 3)
  }

  private getClient(): GoogleGenerativeAI {
    if (!this.client) {
      const apiKey = this.getCurrentApiKey()
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY não configurada")
      }
      this.client = new GoogleGenerativeAI(apiKey)
    }
    return this.client
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private async generateWithRetry(
    model: GenerativeModel,
    prompt: string,
    retries = 3
  ): Promise<GenerateContentResult> {
    const estimatedTokens = this.estimateTokens(prompt)
    await this.waitForRateLimit(estimatedTokens)

    try {
      const result = await model.generateContent(prompt)
      this.recordApiKeySuccess()
      this.recordRequest(estimatedTokens)
      return result
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : ""

      if (retries > 0 && (errorMessage.includes("503") || errorMessage.includes("Overloaded"))) {
        const waitTime = 1000 * 2 ** (3 - retries)
        logger.warn(`Gemini service overloaded, retrying in ${waitTime}ms...`)
        await this.delay(waitTime)
        return this.generateWithRetry(model, prompt, retries - 1)
      }

      if (retries > 0 && (errorMessage.includes("429") || errorMessage.includes("RATE_LIMIT"))) {
        logger.warn("Rate limit hit, waiting 60s before retry...")
        await this.delay(60000)
        return this.generateWithRetry(model, prompt, retries - 1)
      }

      throw error
    }
  }

  /**
   * Converte SpotifyTracks para formato simplificado para análise
   */
  private tracksToAnalysisFormat(tracks: SpotifyTrack[]): TrackForAnalysis[] {
    return tracks.map(track => ({
      id: track.id,
      name: track.name,
      artists: track.artists.map(a => a.name),
      album: track.album.name,
    }))
  }

  /**
   * Refina uma playlist removendo variações/duplicatas semânticas
   *
   * Identifica e remove:
   * - Versões remix (ex: "Perfect Night - Remix", "ANTIFRAGILE (Club Mix)")
   * - Versões slow/sped up (ex: "Perfect Night (Slow)", "Eve - Sped Up")
   * - Versões acústicas (ex: "Love Dive - Acoustic Version")
   * - Versões live (ex: "Fearless - Live at Tokyo Dome")
   * - Versões em outro idioma se a original já existe
   * - Remaster/Remastered duplicados
   * - Músicas que quebram a coesão do contexto
   *
   * Também reorganiza para evitar artistas em sequência e criar curva de energia
   */
  async refinePlaylist(
    tracks: SpotifyTrack[],
    options?: {
      /** Contexto/estilo da playlist (ex: "Rock anos 80 para dirigir", "Músicas para relaxar") */
      context?: string
    }
  ): Promise<RefinedPlaylistResult> {
    if (!process.env.GEMINI_API_KEY) {
      logger.warn("GEMINI_API_KEY not set, skipping refinement")
      return {
        keptTracks: this.tracksToAnalysisFormat(tracks),
        removedTracks: [],
        suggestions: "Refinamento desativado - API key do Gemini não configurada",
      }
    }

    // Verificar se todas as chaves esgotaram quota
    if (this.isQuotaExhausted()) {
      logger.warn("⚠️ Gemini quota exhausted on all keys, skipping refinement", {
        keys: this.apiKeys.map(k => ({
          name: k.name,
          failureCount: k.failureCount,
          isValid: k.isValid,
        })),
      })
      return {
        keptTracks: this.tracksToAnalysisFormat(tracks),
        removedTracks: [],
        suggestions:
          "Refinamento temporariamente indisponível - limite diário de requisições atingido",
      }
    }

    // Verificar se podemos fazer a request
    const status = this.getRateLimitStatus()
    if (!status.canMakeRequest) {
      logger.warn("Gemini rate limit reached, skipping refinement", {
        requestsToday: status.requestsToday,
        limitRPD: status.limits.RPD,
      })
      return {
        keptTracks: this.tracksToAnalysisFormat(tracks),
        removedTracks: [],
        suggestions: `Refinamento ignorado - limite de requests atingido (${status.requestsToday}/${status.limits.RPD} hoje)`,
      }
    }

    try {
      const client = this.getClient()
      const model = client.getGenerativeModel({ model: this.modelName })

      const tracksForAnalysis = this.tracksToAnalysisFormat(tracks)
      const context =
        options?.context || "Playlist personalizada baseada no gosto musical do usuário"

      // Formato compacto: "ID|Nome|Artista1,Artista2|Album"
      const compactTracks = tracksForAnalysis
        .map(t => `${t.id}|${t.name}|${t.artists.join(",")}|${t.album}`)
        .join("\n")

      const prompt = `Você é um Curador Musical. Identifique APENAS duplicatas óbvias (mesma música em versões diferentes).

**Contexto:** ${context}

**DUPLICATAS = mesma música, versão diferente:**
✓ "Perfect Night" + "Perfect Night - Remix" → manter só original
✓ "Dynamite" + "Dynamite (Slow)" → manter só original
✓ "Butter" + "Butter (Hotter Remix)" → manter só original
✓ "Song" + "Song (Remaster 2024)" → manter só remaster

**NÃO são duplicatas:**
✗ Músicas diferentes do mesmo artista
✗ Única versão disponível (só remix existe)
✗ "Song (feat. X)" vs "Song" - são versões diferentes, MANTENHA ambas

**Tracks (formato: ID|Nome|Artistas|Album):**
${compactTracks}

Responda JSON (sem markdown):
{"kept":["id1","id2"],"removed":[{"id":"id3","reason":"Remix de Song"}],"vibe":"Uma frase descrevendo o clima/energia geral da playlist"}`

      const result = await this.generateWithRetry(model, prompt)
      const response = result.response.text()

      // Limpar a resposta (remover possíveis markdown code blocks)
      let cleanResponse = response.trim()
      if (cleanResponse.startsWith("```json")) {
        cleanResponse = cleanResponse.slice(7)
      } else if (cleanResponse.startsWith("```")) {
        cleanResponse = cleanResponse.slice(3)
      }
      if (cleanResponse.endsWith("```")) {
        cleanResponse = cleanResponse.slice(0, -3)
      }
      cleanResponse = cleanResponse.trim()

      // Parse resposta compacta e converter para formato RefinedPlaylistResult
      const compactResult = JSON.parse(cleanResponse) as {
        kept: string[]
        removed: { id: string; reason: string }[]
        vibe: string
      }

      // Converter IDs de volta para objetos TrackForAnalysis
      const trackMap = new Map(tracksForAnalysis.map(t => [t.id, t]))

      const keptTracks = compactResult.kept
        .map(id => trackMap.get(id))
        .filter((t): t is TrackForAnalysis => t !== undefined)

      const removedTracks = compactResult.removed
        .map(r => {
          const track = trackMap.get(r.id)
          if (!track) return null
          return { track, reason: r.reason }
        })
        .filter((r): r is { track: TrackForAnalysis; reason: string } => r !== null)

      const parsed: RefinedPlaylistResult = {
        keptTracks,
        removedTracks,
        suggestions: compactResult.vibe,
      }

      logger.info("Playlist refined by Gemini", {
        originalCount: tracks.length,
        keptCount: parsed.keptTracks.length,
        removedCount: parsed.removedTracks.length,
      })

      return parsed
    } catch (error) {
      logger.error("Error refining playlist with Gemini", {}, error as Error)

      // Check if error is quota exhausted
      const errorMessage = error instanceof Error ? error.message : ""
      if (errorMessage.includes("GEMINI_QUOTA_EXHAUSTED")) {
        // Mark this attempt so we skip future refinements today
        logger.warn("⚠️ Gemini quota exhausted, disabling refinements for rest of day")
        return {
          keptTracks: this.tracksToAnalysisFormat(tracks),
          removedTracks: [],
          suggestions: "Refinamento temporariamente indisponível - limite diário atingido",
        }
      }

      // Fallback: retornar todas as músicas sem refinamento
      return {
        keptTracks: this.tracksToAnalysisFormat(tracks),
        removedTracks: [],
        suggestions: `Erro ao refinar playlist: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      }
    }
  }

  /**
   * Sugere nomes criativos para uma playlist
   */
  async suggestPlaylistName(
    tracks: SpotifyTrack[],
    options?: {
      mood?: string
      theme?: string
      baseArtists?: string[]
    }
  ): Promise<PlaylistNameSuggestion> {
    const defaultName = options?.baseArtists?.length
      ? `Mix: ${options.baseArtists.slice(0, 3).join(", ")}`
      : `My Playlist ${new Date().toLocaleDateString("pt-BR")}`

    if (!process.env.GEMINI_API_KEY) {
      return {
        names: [defaultName],
        reasoning: "Nome padrão - API key do Gemini não configurada",
      }
    }

    // Verificar se podemos fazer a request
    const status = this.getRateLimitStatus()
    if (!status.canMakeRequest) {
      logger.warn("Gemini rate limit reached, using default name", {
        requestsToday: status.requestsToday,
        limitRPD: status.limits.RPD,
      })
      return {
        names: [defaultName],
        reasoning: `Nome padrão - limite de requests atingido (${status.requestsToday}/${status.limits.RPD} hoje)`,
      }
    }

    try {
      const client = this.getClient()
      const model = client.getGenerativeModel({ model: this.modelName })

      // Extrair artistas únicos (top 8)
      const uniqueArtists = [...new Set(tracks.flatMap(t => t.artists.map(a => a.name)))].slice(
        0,
        8
      )

      // Formato compacto das músicas
      const trackList = tracks
        .slice(0, 15)
        .map(t => `${t.name} - ${t.artists[0]?.name}`)
        .join("\n")

      const prompt = `Sugira 5 nomes de playlist como uma pessoa real faria no Spotify.

**Músicas:**
${trackList}

**Artistas:** ${uniqueArtists.join(", ")}
${options?.baseArtists?.length ? `**Baseado em:** ${options.baseArtists.join(", ")}` : ""}

**Estilo de nomes que pessoas REAIS usam:**
✓ Vibes curtas: "late night drive", "main character energy", "3am thoughts"
✓ Mood simples: "chill", "hype", "sad hours", "gym beast"
✓ Situações: "cooking dinner", "shower concert", "road trip"
✓ Sentimentos: "in my feels", "healing era", "hot girl summer"
✓ Referências pop: usar gírias, emojis ocasionais, inglês casual
✓ Minúsculas são ok (e até preferidas)

**NÃO faça:**
✗ Nomes formais/corporativos ("Seleção Musical Especial")
✗ Nomes genéricos ("Playlist de Rock", "Mix Top Hits")
✗ Nomes muito elaborados ou poéticos demais
✗ Descrições literais ("Músicas para Relaxar")

JSON (sem markdown):
{"names":["nome1","nome2","nome3","nome4","nome5"],"vibe":"uma palavra resumindo o clima"}`

      const result = await this.generateWithRetry(model, prompt)
      const response = result.response.text()

      // Limpar a resposta
      let cleanResponse = response.trim()
      if (cleanResponse.startsWith("```json")) {
        cleanResponse = cleanResponse.slice(7)
      } else if (cleanResponse.startsWith("```")) {
        cleanResponse = cleanResponse.slice(3)
      }
      if (cleanResponse.endsWith("```")) {
        cleanResponse = cleanResponse.slice(0, -3)
      }
      cleanResponse = cleanResponse.trim()

      const parsed = JSON.parse(cleanResponse) as { names: string[]; vibe: string }

      logger.info("Playlist names suggested by Gemini", {
        namesCount: parsed.names.length,
        vibe: parsed.vibe,
      })

      return {
        names: parsed.names,
        reasoning: parsed.vibe,
      }
    } catch (error) {
      logger.error("Error suggesting playlist names with Gemini", {}, error as Error)

      // Fallback
      const fallbackName = options?.baseArtists?.length
        ? `Mix: ${options.baseArtists.slice(0, 3).join(", ")}`
        : `Playlist ${new Date().toLocaleDateString("pt-BR")}`

      return {
        names: [fallbackName],
        reasoning: `Erro ao gerar nomes: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      }
    }
  }

  /**
   * Analisa o perfil musical do usuário baseado nas top tracks
   */
  async analyzeMusicalProfile(tracks: SpotifyTrack[]): Promise<{
    genres: string[]
    mood: string
    description: string
    recommendations: string[]
  }> {
    if (!process.env.GEMINI_API_KEY) {
      return {
        genres: [],
        mood: "Não disponível",
        description: "Análise não disponível - API key do Gemini não configurada",
        recommendations: [],
      }
    }

    // Verificar se podemos fazer a request
    const status = this.getRateLimitStatus()
    if (!status.canMakeRequest) {
      logger.warn("Gemini rate limit reached, skipping profile analysis", {
        requestsToday: status.requestsToday,
        limitRPD: status.limits.RPD,
      })
      return {
        genres: [],
        mood: "Não disponível",
        description: `Análise não disponível - limite de requests atingido (${status.requestsToday}/${status.limits.RPD} hoje)`,
        recommendations: [],
      }
    }

    try {
      const client = this.getClient()
      const model = client.getGenerativeModel({ model: this.modelName })

      const trackSummary = tracks.map(t => ({
        name: t.name,
        artist: t.artists[0]?.name,
        popularity: t.popularity,
      }))

      const uniqueArtists = [...new Set(tracks.flatMap(t => t.artists.map(a => a.name)))]

      const prompt = `Você é um especialista em análise de perfil musical.

Analise o perfil musical de um usuário baseado nas suas músicas mais ouvidas:

ARTISTAS MAIS OUVIDOS: ${uniqueArtists.slice(0, 15).join(", ")}

TOP MÚSICAS:
${JSON.stringify(trackSummary.slice(0, 25), null, 2)}

Forneça uma análise do perfil musical incluindo:
1. Gêneros musicais predominantes
2. Mood/vibe geral das escolhas
3. Uma descrição personalizada do gosto musical (2-3 frases)
4. Sugestões de artistas similares que o usuário pode gostar

Responda APENAS com um JSON válido no seguinte formato (sem markdown, sem code blocks):
{
  "genres": ["gênero1", "gênero2", "gênero3"],
  "mood": "Descrição curta do mood (ex: 'Energético e Dançante')",
  "description": "Descrição mais longa do perfil musical",
  "recommendations": ["Artista 1", "Artista 2", "Artista 3", "Artista 4", "Artista 5"]
}`

      const result = await this.generateWithRetry(model, prompt)
      const response = result.response.text()

      let cleanResponse = response.trim()
      if (cleanResponse.startsWith("```json")) {
        cleanResponse = cleanResponse.slice(7)
      } else if (cleanResponse.startsWith("```")) {
        cleanResponse = cleanResponse.slice(3)
      }
      if (cleanResponse.endsWith("```")) {
        cleanResponse = cleanResponse.slice(0, -3)
      }
      cleanResponse = cleanResponse.trim()

      return JSON.parse(cleanResponse)
    } catch (error) {
      logger.error("Error analyzing musical profile with Gemini", {}, error as Error)

      return {
        genres: [],
        mood: "Erro na análise",
        description: `Erro ao analisar perfil: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        recommendations: [],
      }
    }
  }
}

export const geminiService = new GeminiService()
