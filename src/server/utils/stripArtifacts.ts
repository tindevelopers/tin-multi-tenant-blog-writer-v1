import sanitizeHtml from "sanitize-html";

/**
 * stripArtifacts cleans raw LLM-generated HTML:
 * 1. Removes stray sequences like `!<` or `#<`
 * 2. Collapses redundant <br> tags
 * 3. Converts leftover markdown headings (#, ##, ###) to HTML
 * 4. Decodes basic entities & trims whitespace
 * 5. Runs sanitize-html allowing common tags
 */
export function stripArtifacts(html: string): string {
  if (!html) return html;
  let cleaned = html;

  // 1. Remove artifact patterns
  cleaned = cleaned.replace(/!<\/?/g, "");
  cleaned = cleaned.replace(/#<\/?/g, "");

  // 2. Collapse multiple <br> occurrences
  cleaned = cleaned.replace(/(?:<br\s*\/?>\s*){2,}/gi, "<br>");

  // helper to convert markdown headings (#, ##, ###) at line start
  const convertMarkdown = () => {
    cleaned = cleaned.replace(/^###\s+(.+)$/gim, "<h3>$1</h3>");
    cleaned = cleaned.replace(/^##\s+(.+)$/gim, "<h2>$1</h2>");
    cleaned = cleaned.replace(/^#\s+(.+)$/gim, "<h1>$1</h1>");
  };

  convertMarkdown();

  // 3. Trim whitespace between tags
  cleaned = cleaned.replace(/>\s+</g, "><");

  // 4. Decode common entities introduced earlier
  cleaned = cleaned.replace(/&gt;/g, ">").replace(/&lt;/g, "<");
  convertMarkdown(); // run again after decoding

  // 5. Final sanitisation
  cleaned = sanitizeHtml(cleaned, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2", "h3", "br", "p"]),
    allowedAttributes: {
      a: ["href", "name", "target"],
      img: ["src", "alt"],
      '*': ["style"]
    }
  });

  return cleaned.trim();
}
