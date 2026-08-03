import DOMPurify from "isomorphic-dompurify"

/**
 * Convert HTML content to plain text for search and fallback purposes
 */
export function htmlToPlainText(html: string): string {
  if (!html || html.trim() === "") return ""

  // Remove HTML tags and decode entities
  const withoutTags = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "") // Remove style tags
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "") // Remove script tags
    .replace(/<[^>]*>/g, "") // Remove all HTML tags
    .replace(/&nbsp;/g, " ") // Replace non-breaking spaces
    .replace(/&amp;/g, "&") // Decode common entities
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")

  // Clean up whitespace
  return withoutTags
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .trim()
}

/**
 * Check if content is likely HTML (contains HTML tags)
 */
export function isHtmlContent(content: string): boolean {
  if (!content) return false

  // Check for common HTML patterns
  const htmlPattern = /<\/?[a-z][\s\S]*>/i
  return htmlPattern.test(content)
}

// Allowlist de atributos suportados pelo editor TipTap (além dos padrões seguros)
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "strong",
    "em",
    "s",
    "u",
    "mark",
    "code",
    "pre",
    "sub",
    "sup",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "blockquote",
    "a",
    "img",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "hr",
    "span",
    "div",
  ],
  ALLOWED_ATTR: ["href", "src", "alt", "title", "target", "rel", "colspan", "rowspan", "style"],
  ALLOWED_URI_REGEXP:
    /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  ALLOW_DATA_ATTR: false,
}

/**
 * Sanitize HTML content for safe display using DOMPurify with an allowlist.
 * Remove dangerous tags, event handlers and unsafe protocols.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ""
  return DOMPurify.sanitize(html, SANITIZE_CONFIG)
}

/**
 * Get a preview of the content (first 150 characters)
 */
export function getContentPreview(content: string, maxLength: number = 150): string {
  const plainText = isHtmlContent(content) ? htmlToPlainText(content) : content

  if (plainText.length <= maxLength) {
    return plainText
  }

  return `${plainText.substring(0, maxLength).trim()}...`
}

/**
 * Escape HTML special characters in plain text
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/**
 * Convert plain text to basic HTML with paragraph tags
 */
export function plainTextToHtml(text: string): string {
  if (!text || text.trim() === "") return "<p></p>"

  // Split by double line breaks (paragraphs) and single line breaks
  const paragraphs = text
    .split(/\n\s*\n/) // Split on double line breaks
    .map(paragraph =>
      paragraph
        .split("\n") // Split on single line breaks
        .map(line => escapeHtml(line.trim()))
        .filter(line => line.length > 0)
        .join("<br>")
    )
    .filter(paragraph => paragraph.length > 0)

  if (paragraphs.length === 0) {
    return "<p></p>"
  }

  return paragraphs.map(paragraph => `<p>${paragraph}</p>`).join("")
}

/**
 * Migrate legacy plain text content to rich text format
 */
export function migratePlainTextToRich(plainText: string): string {
  if (!plainText || plainText.trim() === "") {
    return "<p></p>"
  }

  return plainTextToHtml(plainText)
}
