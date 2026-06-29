// Provider-Presets: bekannte /v1-Endpunkte als Auswahl beim Anlegen eines Anbieters.
// type = Channel-Typ des Relay-Motors (relay/channeltype). models nur Vorschläge (editierbar).

export type ProviderPreset = {
  id: string;
  label: string;
  type: number;
  base_url: string;
  models: string;
};

export const providerPresets: ProviderPreset[] = [
  { id: "openai", label: "OpenAI", type: 1, base_url: "https://api.openai.com", models: "gpt-4o,gpt-4o-mini,o1" },
  { id: "anthropic", label: "Anthropic (Claude)", type: 14, base_url: "https://api.anthropic.com", models: "claude-opus-4-8,claude-sonnet-4-6,claude-haiku-4-5" },
  { id: "gemini", label: "Google Gemini", type: 24, base_url: "https://generativelanguage.googleapis.com", models: "gemini-2.0-flash,gemini-1.5-pro" },
  { id: "groq", label: "Groq", type: 29, base_url: "https://api.groq.com/openai", models: "llama-3.3-70b-versatile" },
  { id: "mistral", label: "Mistral", type: 28, base_url: "https://api.mistral.ai", models: "mistral-large-latest,mistral-small-latest" },
  { id: "deepseek", label: "DeepSeek", type: 36, base_url: "https://api.deepseek.com", models: "deepseek-chat,deepseek-reasoner" },
  { id: "openrouter", label: "OpenRouter", type: 20, base_url: "https://openrouter.ai/api", models: "" },
  { id: "ollama", label: "Ollama (lokal)", type: 30, base_url: "http://localhost:11434", models: "llama3.2,qwen2.5" },
  // LM Studio: lokaler OpenAI-kompatibler Server. Läuft die App im Container, ist localhost der
  // Container — daher host.docker.internal. LM Studio ggf. einen API-Token verlangen lassen/abschalten.
  { id: "lmstudio", label: "LM Studio (lokal)", type: 50, base_url: "http://host.docker.internal:1234/v1", models: "" },
  { id: "custom", label: "OpenAI-kompatibel (eigener Endpunkt)", type: 50, base_url: "", models: "" },
];
