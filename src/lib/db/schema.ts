import { boolean, index, integer, json, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

// Better Auth tables (official schema)
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: text("role").notNull().default("user"), // "dev" or "user"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

// Export with original names for backward compatibility
export const users = user
export const sessions = session
export const accounts = account
export const verifications = verification

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    content: text("content").notNull().default(""), // Rich text HTML content
    plainTextContent: text("plain_text_content").default(""), // Plain text fallback for search
    contentType: text("content_type").notNull().default("rich"), // 'rich' | 'plain'
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    shared: boolean("shared").notNull().default(false),
    sharedVia: text("shared_via"), // 'email' | 'link' | null
    shareToken: text("share_token").unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  table => ({
    userIdIdx: index("documents_user_id_idx").on(table.userId),
    shareTokenIdx: index("documents_share_token_idx").on(table.shareToken),
  })
)

export const documentShares = pgTable(
  "document_shares",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    sharedWithEmail: text("shared_with_email"),
    sharedWithDiscordId: text("shared_with_discord_id"),
    shareToken: text("share_token").notNull().unique(),
    validationType: text("validation_type").notNull().default("none"), // 'none' | 'email' | 'discord' | 'email_or_discord'
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => ({
    documentIdIdx: index("document_shares_document_id_idx").on(table.documentId),
    shareTokenIdx: index("document_shares_share_token_idx").on(table.shareToken),
  })
)

export const userInvites = pgTable(
  "user_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    inviteToken: text("invite_token").notNull().unique(),
    createdById: text("created_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"), // "pending", "accepted", "expired"
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => ({
    emailIdx: index("user_invites_email_idx").on(table.email),
    documentIdIdx: index("user_invites_document_id_idx").on(table.documentId),
    inviteTokenIdx: index("user_invites_invite_token_idx").on(table.inviteToken),
  })
)

export const emailSettings = pgTable("email_settings", {
  id: text("id").primaryKey().default("default"),
  apiKey: text("api_key"), // Resend API key
  fromEmail: text("from_email").notNull().default("noreply@update.blasiusy.site"),
  fromName: text("from_name").notNull().default("WriteSpace"),
  isActive: boolean("is_active").notNull().default(true),
  // Email Template Settings
  emailSubjectTemplate: text("email_subject_template").default(
    "Convite para visualizar: {{documentTitle}}"
  ),
  emailBodyTemplate: text("email_body_template").default(""), // Custom HTML template
  useCustomTemplate: boolean("use_custom_template").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

// Music/Spotify feature tables
export const generatedPlaylists = pgTable(
  "generated_playlists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    spotifyPlaylistId: text("spotify_playlist_id"), // ID da playlist no Spotify após criação
    spotifyPlaylistUrl: text("spotify_playlist_url"), // URL para abrir no Spotify
    trackCount: text("track_count").notNull().default("0"),
    seedArtists: text("seed_artists"), // JSON array de artistas usados como seed
    seedTracks: text("seed_tracks"), // JSON array de tracks usadas como seed
    tracks: text("tracks"), // JSON array de tracks que compõem a playlist
    generationType: text("generation_type").notNull().default("top-tracks"), // 'top-tracks' | 'artist-mix' | 'custom' | 'discovery'
    wasRefined: boolean("was_refined").notNull().default(false), // Se passou pelo Gemini
    removedDuplicates: text("removed_duplicates"), // JSON array de tracks removidas pelo Gemini
    status: text("status").notNull().default("draft"), // 'draft' | 'created' | 'failed'
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => ({
    userIdIdx: index("generated_playlists_user_id_idx").on(table.userId),
    statusIdx: index("generated_playlists_status_idx").on(table.status),
  })
)

// Music blacklist tables
export const spotifyTrackBlacklist = pgTable(
  "spotify_track_blacklist",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    spotifyTrackId: text("spotify_track_id").notNull(),
    trackName: text("track_name").notNull(),
    artistName: text("artist_name").notNull(),
    reason: text("reason"), // "dislike" | "explicit" | "already_heard" | other
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => ({
    userIdIdx: index("spotify_track_blacklist_user_id_idx").on(table.userId),
    trackIdIdx: index("spotify_track_blacklist_track_id_idx").on(table.spotifyTrackId),
    userTrackIdx: index("spotify_track_blacklist_user_track_idx").on(
      table.userId,
      table.spotifyTrackId
    ),
  })
)

export const spotifyArtistBlacklist = pgTable(
  "spotify_artist_blacklist",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    spotifyArtistId: text("spotify_artist_id").notNull(),
    artistName: text("artist_name").notNull(),
    reason: text("reason"), // "dislike" | "too_similar" | other
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => ({
    userIdIdx: index("spotify_artist_blacklist_user_id_idx").on(table.userId),
    artistIdIdx: index("spotify_artist_blacklist_artist_id_idx").on(table.spotifyArtistId),
    userArtistIdx: index("spotify_artist_blacklist_user_artist_idx").on(
      table.userId,
      table.spotifyArtistId
    ),
  })
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type Account = typeof accounts.$inferSelect
export type NewAccount = typeof accounts.$inferInsert
export type Document = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert
export type DocumentShare = typeof documentShares.$inferSelect
export type NewDocumentShare = typeof documentShares.$inferInsert
export type UserInvite = typeof userInvites.$inferSelect
export type NewUserInvite = typeof userInvites.$inferInsert
export type EmailSettings = typeof emailSettings.$inferSelect
export type NewEmailSettings = typeof emailSettings.$inferInsert
export type SpotifyTrackBlacklist = typeof spotifyTrackBlacklist.$inferSelect
export type NewSpotifyTrackBlacklist = typeof spotifyTrackBlacklist.$inferInsert
export type SpotifyArtistBlacklist = typeof spotifyArtistBlacklist.$inferSelect
export type NewSpotifyArtistBlacklist = typeof spotifyArtistBlacklist.$inferInsert
export type GeneratedPlaylist = typeof generatedPlaylists.$inferSelect
export type NewGeneratedPlaylist = typeof generatedPlaylists.$inferInsert

// Playlist generation jobs (replaces BullMQ for simpler in-database job queue)
export const playlistGenerationJobs = pgTable(
  "playlist_generation_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // Job configuration
    type: text("type").notNull(), // "top-tracks" | "artist-mix" | "discovery"
    timeRange: text("time_range"), // "short_term" | "medium_term" | "long_term"
    artistIds: text("artist_ids"), // JSON array
    playlistSize: integer("playlist_size").notNull().default(30),
    includeRecommendations: boolean("include_recommendations").default(true),
    refineWithGemini: boolean("refine_with_gemini").default(true),
    excludeStoredTracks: boolean("exclude_stored_tracks").default(true),

    // Job status
    status: text("status").notNull().default("pending"), // "pending" | "processing" | "completed" | "failed"
    progress: integer("progress").default(0), // 0-100
    attempts: integer("attempts").default(0),
    maxAttempts: integer("max_attempts").default(3),

    // Results
    result: json("result"), // GeneratedPlaylist result
    error: text("error"), // Error message if failed

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => ({
    userIdIdx: index("idx_playlist_jobs_user_id").on(table.userId),
    statusIdx: index("idx_playlist_jobs_status").on(table.status),
    createdAtIdx: index("idx_playlist_jobs_created_at").on(table.createdAt),
  })
)

export type PlaylistGenerationJob = typeof playlistGenerationJobs.$inferSelect
export type NewPlaylistGenerationJob = typeof playlistGenerationJobs.$inferInsert
