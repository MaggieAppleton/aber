import { Lexer, type Token } from "marked";
import type { ReactNode } from "react";
import "./assistant-text.css";

function emphasis(tokens: Token[]): ReactNode[] {
  return tokens.map((token, index) => {
    if (token.type === "strong" && token.tokens) return <strong key={index}>{emphasis(token.tokens)}</strong>;
    if (token.type === "em" && token.tokens) return <em key={index}>{emphasis(token.tokens)}</em>;
    // Everything else remains text: HTML, URLs and images never become executable elements.
    return token.type === "escape" ? token.text : token.raw;
  });
}

/** Re-lex the accumulated reply on each render, including incomplete streamed delimiters. */
export function AssistantText({ text }: { text: string }) {
  return <span className="ab-assistant-text">{emphasis(Lexer.lexInline(text, { gfm: false }))}</span>;
}
