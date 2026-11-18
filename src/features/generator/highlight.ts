export type CodeToken = {
  type: "comment" | "string" | "keyword" | "plain",
  text: string
};

const TOKEN_PATTERN = /(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*")|\b(import|from|export|default|true|false|null)\b/g;

/** Splits the generated config into tokens for light syntax highlighting. */
export function highlight(code: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  let lastIndex = 0;

  for (const match of code.matchAll(TOKEN_PATTERN)) {
    if (match.index > lastIndex) {
      tokens.push({ type: "plain", text: code.slice(lastIndex, match.index) });
    }

    tokens.push({ type: match[1] ? "comment" : match[2] ? "string" : "keyword", text: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < code.length) {
    tokens.push({ type: "plain", text: code.slice(lastIndex) });
  }

  return tokens;
}
