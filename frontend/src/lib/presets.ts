// Provider-Presets: bekannte Endpunkte als Auswahl beim Anlegen eines Anbieters.
// type = Channel-Typ des Relay-Motors (relay/channeltype). models nur Vorschläge (editierbar).
// base_url ist immer editierbar — Presets füllen nur sinnvolle Vorgaben vor.
//
// WICHTIG: Das Gateway proxt Anbieter über einen HTTP-Endpoint + API-Key. Reine
// OAuth-/Device-Flow-/lokale-Spawn-Anbieter (z. B. GitHub Copilot, ChatGPT/Codex-OAuth,
// Grok-OAuth, Qwen-OAuth) lassen sich NICHT als Relay-Kanal abbilden und sind daher
// bewusst nicht als Preset enthalten — wo ein Anbieter zusätzlich einen API-Key bietet,
// ist die Key-Variante aufgeführt.

export type ProviderPreset = {
  id: string;
  label: string;
  group: string;
  type: number;
  base_url: string;
  models: string;
  note?: string;
};

// Channel-Typ (Zahl) → lesbarer Name, für die Anbieter-Tabelle.
export const channelTypeName: Record<number, string> = {
  1: "OpenAI",
  3: "Azure OpenAI",
  14: "Anthropic",
  16: "Zhipu / GLM",
  17: "Alibaba (DashScope)",
  20: "OpenRouter",
  23: "Tencent",
  24: "Google Gemini",
  25: "Moonshot / Kimi",
  27: "MiniMax",
  28: "Mistral",
  29: "Groq",
  30: "Ollama",
  32: "StepFun",
  33: "AWS Bedrock (Claude)",
  35: "Cohere",
  36: "DeepSeek",
  39: "Together AI",
  41: "Novita AI",
  44: "SiliconFlow",
  45: "xAI (Grok)",
  50: "OpenAI-kompatibel",
  51: "Gemini (OpenAI-kompatibel)",
};

export function channelTypeLabel(type: number): string {
  return channelTypeName[type] || `Typ ${type}`;
}

// Gemeinsame Notiz für lokale/On-Prem-Server: Läuft die App im Docker-Container, ist
// "localhost" der Container — nicht dein Rechner. Für einen lokalen Server auf demselben
// Mac: host.docker.internal. Für einen Server im LAN/VPN/Tailscale: dessen IP direkt
// (z. B. http://100.x.y.z:PORT/v1 bei Tailscale) eintragen.
const ON_PREM_NOTE =
  "Im Docker-Container ist 'localhost' der Container. Lokaler Server am selben Mac → host.docker.internal; " +
  "Server im LAN/VPN/Tailscale → dessen IP direkt eintragen (z. B. http://100.x.y.z:PORT/v1).";

const G_CLOUD = "Große Cloud-Anbieter";
const G_MORE = "Weitere Cloud / OpenAI-kompatibel";
const G_LOCAL = "Lokal / On-Prem (LAN·VPN·Tailscale)";
const G_CUSTOM = "Eigener Endpunkt";

export const providerPresets: ProviderPreset[] = [
  // ---- Große Cloud-Anbieter (native Channel-Typen) ----
  { id: "openai", label: "OpenAI", group: G_CLOUD, type: 1, base_url: "https://api.openai.com", models: "gpt-4o,gpt-4o-mini,o1" },
  { id: "anthropic", label: "Anthropic (Claude)", group: G_CLOUD, type: 14, base_url: "https://api.anthropic.com", models: "claude-opus-4-8,claude-sonnet-4-6,claude-haiku-4-5" },
  { id: "gemini", label: "Google Gemini", group: G_CLOUD, type: 24, base_url: "https://generativelanguage.googleapis.com", models: "gemini-2.0-flash,gemini-1.5-pro" },
  { id: "xai", label: "xAI (Grok) — API-Key", group: G_CLOUD, type: 45, base_url: "https://api.x.ai", models: "grok-2-latest", note: "API-Key (XAI_API_KEY). Der 'SuperGrok'-OAuth-Login ist nicht Gateway-fähig." },
  { id: "mistral", label: "Mistral", group: G_CLOUD, type: 28, base_url: "https://api.mistral.ai", models: "mistral-large-latest,mistral-small-latest" },
  { id: "groq", label: "Groq", group: G_CLOUD, type: 29, base_url: "https://api.groq.com/openai", models: "llama-3.3-70b-versatile" },
  { id: "deepseek", label: "DeepSeek", group: G_CLOUD, type: 36, base_url: "https://api.deepseek.com", models: "deepseek-chat,deepseek-reasoner" },
  { id: "cohere", label: "Cohere", group: G_CLOUD, type: 35, base_url: "https://api.cohere.ai", models: "command-r-plus" },
  { id: "azure", label: "Azure OpenAI / AI Foundry", group: G_CLOUD, type: 3, base_url: "", models: "", note: "Basis-URL = dein Azure-/Foundry-Endpunkt (https://<resource>.openai.azure.com), plus API-Key." },
  { id: "bedrock", label: "AWS Bedrock (Claude)", group: G_CLOUD, type: 33, base_url: "", models: "anthropic.claude-3-5-sonnet-20241022-v2:0", note: "Nutzt AWS-Credentials (Region/Access-Key/Secret) statt base_url." },

  // ---- Weitere Cloud / OpenAI-kompatibel ----
  { id: "openrouter", label: "OpenRouter", group: G_MORE, type: 20, base_url: "https://openrouter.ai/api", models: "" },
  { id: "novita", label: "Novita AI", group: G_MORE, type: 41, base_url: "https://api.novita.ai/v3/openai", models: "" },
  { id: "together", label: "Together AI", group: G_MORE, type: 39, base_url: "https://api.together.xyz", models: "" },
  { id: "siliconflow", label: "SiliconFlow", group: G_MORE, type: 44, base_url: "https://api.siliconflow.cn", models: "" },
  { id: "moonshot", label: "Kimi / Moonshot", group: G_MORE, type: 25, base_url: "https://api.moonshot.cn", models: "moonshot-v1-128k", note: "International ggf. https://api.moonshot.ai/v1." },
  { id: "minimax", label: "MiniMax — API-Key", group: G_MORE, type: 27, base_url: "", models: "", note: "API-Key (MINIMAX_API_KEY). Der OAuth-Login ist nicht Gateway-fähig." },
  { id: "dashscope", label: "Qwen Cloud (Alibaba DashScope)", group: G_MORE, type: 17, base_url: "https://dashscope.aliyuncs.com", models: "qwen-max,qwen-plus", note: "DASHSCOPE_API_KEY. Der Qwen-OAuth-Login ist nicht Gateway-fähig." },
  { id: "zhipu", label: "z.ai / GLM (Zhipu)", group: G_MORE, type: 50, base_url: "https://api.z.ai/api/paas/v4", models: "glm-4-plus", note: "z.ai (international). China-Endpunkt: https://open.bigmodel.cn/api/paas/v4." },
  { id: "stepfun", label: "StepFun", group: G_MORE, type: 32, base_url: "https://api.stepfun.com", models: "" },
  { id: "tencent", label: "Tencent (Hunyuan)", group: G_MORE, type: 23, base_url: "", models: "", note: "Tencent-Hunyuan-Zugang; TokenHub/MaaS ggf. als 'OpenAI-kompatibel' mit eigener base_url." },
  { id: "nvidia", label: "NVIDIA Build (NIM)", group: G_MORE, type: 50, base_url: "https://integrate.api.nvidia.com/v1", models: "", note: "NVIDIA_API_KEY (build.nvidia.com)." },
  { id: "huggingface", label: "Hugging Face (Router)", group: G_MORE, type: 50, base_url: "https://router.huggingface.co/v1", models: "", note: "HF_TOKEN." },
  { id: "gmi", label: "GMI Cloud", group: G_MORE, type: 50, base_url: "https://api.gmi-serving.com/v1", models: "", note: "Basis-URL beim Anbieter prüfen; OpenAI-kompatibel." },
  { id: "arcee", label: "Arcee AI", group: G_MORE, type: 50, base_url: "", models: "", note: "OpenAI-kompatibel — Basis-URL beim Anbieter eintragen." },
  { id: "kilocode", label: "Kilo Code", group: G_MORE, type: 50, base_url: "", models: "", note: "OpenAI-kompatibel — Basis-URL beim Anbieter eintragen." },
  { id: "xiaomi", label: "Xiaomi MiMo", group: G_MORE, type: 50, base_url: "", models: "", note: "OpenAI-kompatibel — Basis-URL beim Anbieter eintragen." },
  { id: "opencode-zen", label: "OpenCode Zen", group: G_MORE, type: 50, base_url: "", models: "", note: "OpenAI-kompatibel — Basis-URL beim Anbieter eintragen." },

  // ---- Lokal / On-Prem (LAN · VPN · Tailscale) ----
  { id: "lmstudio", label: "LM Studio (lokal)", group: G_LOCAL, type: 50, base_url: "http://host.docker.internal:1234/v1", models: "", note: ON_PREM_NOTE + " LM Studio ggf. API-Token (LM_API_KEY) verlangen lassen/abschalten." },
  { id: "ollama", label: "Ollama (lokal)", group: G_LOCAL, type: 30, base_url: "http://host.docker.internal:11434", models: "llama3.2,qwen2.5", note: ON_PREM_NOTE },
  { id: "vllm", label: "vLLM (lokal)", group: G_LOCAL, type: 50, base_url: "http://host.docker.internal:8000/v1", models: "", note: ON_PREM_NOTE + " vLLM startet den OpenAI-Server üblicherweise auf Port 8000." },
  { id: "vmlx", label: "vMLX / mlx-lm (lokal, Apple Silicon)", group: G_LOCAL, type: 50, base_url: "http://host.docker.internal:8080/v1", models: "", note: ON_PREM_NOTE + " mlx_lm.server startet den OpenAI-Server üblicherweise auf Port 8080." },
  { id: "ollama-cloud", label: "Ollama Cloud", group: G_LOCAL, type: 50, base_url: "https://ollama.com/v1", models: "", note: "Cloud-gehostetes Ollama mit API-Key." },

  // ---- Eigener Endpunkt ----
  { id: "custom", label: "OpenAI-kompatibel (eigener Endpunkt)", group: G_CUSTOM, type: 50, base_url: "", models: "", note: "Beliebiger OpenAI-kompatibler Server — Basis-URL + optionaler API-Key." },
];
