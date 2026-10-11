import type { ChatLocale } from "./reply-locale";

const STORAGE_KEY = "nemora-chat-history-v2";

export interface PersistedChatMessage {
  id: string;
  role: "bot" | "user";
  text: string;
  /** Inline tappable business picker under this bot message */
  picker?: "services";
  /** Epoch ms — optional for older saved histories */
  at?: number;
}

export interface PersistedChatState {
  messages: PersistedChatMessage[];
  replyLocale: ChatLocale;
  updatedAt: number;
}

const WELCOME_EN: PersistedChatMessage = {
  id: "welcome",
  role: "bot",
  text: "What business should we quote for?\n\nTap a suggestion on the left, or type a business (e.g. Coffee shop).",
};

export function defaultChatMessages(): PersistedChatMessage[] {
  return [WELCOME_EN];
}

export function loadChatHistory(): PersistedChatState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedChatState;
    if (!parsed?.messages || !Array.isArray(parsed.messages) || parsed.messages.length === 0) {
      return null;
    }
    return {
      messages: parsed.messages,
      replyLocale: parsed.replyLocale === "tanglish" ? "tanglish" : "en",
      updatedAt: parsed.updatedAt ?? Date.now(),
    };
  } catch {
    return null;
  }
}

/** Append-only history — never clears unless caller replaces full list intentionally. */
export function saveChatHistory(
  messages: PersistedChatMessage[],
  replyLocale: ChatLocale,
): void {
  if (typeof window === "undefined") return;
  const payload: PersistedChatState = {
    messages,
    replyLocale,
    updatedAt: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
