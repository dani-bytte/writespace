import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  headers: async () => {
    // Different CSP for development and production
    const isDev = process.env.NODE_ENV === "development"
    const connectSrcUrls = [
      "'self'",
      "https://accounts.google.com",
      "https://oauth2.googleapis.com",
      "https://discord.com",
      "https://discordapp.com",
      ...(isDev ? ["http://localhost:*", "ws://localhost:*"] : []),
    ].join(" ")

    // CSP script-src configuration:
    // - 'unsafe-eval' is required in development for Next.js hot reload/Fast Refresh
    // - 'unsafe-inline' is needed for inline scripts (consider migrating to nonces in future)
    // - In production, we remove 'unsafe-eval' to prevent eval() attacks
    const scriptSrc = [
      "'self'",
      // unsafe-eval only in development for Next.js Fast Refresh
      ...(isDev ? ["'unsafe-eval'"] : []),
      // unsafe-inline still needed for some inline scripts - TODO: migrate to nonces
      "'unsafe-inline'",
      "https://accounts.google.com",
      "https://www.gstatic.com",
      "https://static.cloudflareinsights.com",
    ].join(" ")

    return [
      {
        source: "/(.*)",
        headers: [
          // Content Security Policy - Hardened for production
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src ${scriptSrc}`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              // Restrict img-src to specific trusted domains in production
              isDev
                ? "img-src 'self' data: https: blob:"
                : "img-src 'self' data: blob: https://*.googleusercontent.com https://*.discordapp.com https://*.spotify.com https://*.scdn.co",
              `connect-src ${connectSrcUrls}`,
              "frame-src 'self' https://accounts.google.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              ...(isDev ? [] : ["upgrade-insecure-requests"]),
            ].join("; "),
          },
          // HTTP Strict Transport Security
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          // Prevent clickjacking
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // Prevent MIME type sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // XSS Protection
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // Referrer Policy
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Permissions Policy
          {
            key: "Permissions-Policy",
            value: [
              "camera=()",
              "microphone=()",
              "geolocation=()",
              "interest-cohort=()",
              "payment=()",
              "usb=()",
            ].join(", "),
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ]
  },
  // Security-related configurations
  poweredByHeader: false, // Hide X-Powered-By header
  reactStrictMode: true,

  // Allow cross-origin requests from localhost/127.0.0.1 in development
  allowedDevOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],

  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },

  // Source maps configuration
  productionBrowserSourceMaps: false,

  // Docker/container optimization
  output: "standalone",

  experimental: {
    // Enable security features
    serverMinification: true,
    // Optimize package imports for better tree-shaking.
    // Next.js will barrel-file optimize these packages, reducing client bundle size.
    optimizePackageImports: [
      // Icons
      "lucide-react",
      // Radix UI primitives (each has many sub-exports)
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-aspect-ratio",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-context-menu",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-label",
      "@radix-ui/react-menubar",
      "@radix-ui/react-navigation-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-progress",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slider",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
      "@radix-ui/react-toggle",
      "@radix-ui/react-toggle-group",
      "@radix-ui/react-tooltip",
      // Tiptap editor packages
      "@tiptap/react",
      "@tiptap/starter-kit",
      "@tiptap/pm",
      "@tiptap/extension-highlight",
      "@tiptap/extension-image",
      "@tiptap/extension-link",
      "@tiptap/extension-placeholder",
      "@tiptap/extension-subscript",
      "@tiptap/extension-superscript",
      "@tiptap/extension-table",
      "@tiptap/extension-table-cell",
      "@tiptap/extension-table-header",
      "@tiptap/extension-table-row",
      "@tiptap/extension-task-item",
      "@tiptap/extension-task-list",
      "@tiptap/extension-underline",
      // Other large packages with many exports
      "recharts",
      "date-fns",
      "@tanstack/react-query",
      "@tanstack/react-table",
    ],
  },
}

export default nextConfig
