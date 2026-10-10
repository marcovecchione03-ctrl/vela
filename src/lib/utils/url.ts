export function normalizeWebsiteUrl(url: unknown): string | undefined {
  if (typeof url !== "string") return undefined;
  let trimmed = url.trim();
  if (trimmed === "") return undefined;
  
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    trimmed = "https://" + trimmed;
  }
  
  return trimmed;
}
