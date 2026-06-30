import type { TFunction } from "i18next";

// Bekannte (oft hartkodiert chinesische) Backend-Fehler von One-API → lokalisierte
// Meldung über die Frontend-i18n. Substring-Matching, da manche Strings dynamische
// Teile enthalten (z. B. Modellname). Unbekannte Meldungen werden unverändert gezeigt.
const MAP: { test: (m: string) => boolean; key: string; def: string }[] = [
  { test: (m) => m.includes("用户名或密码错误"), key: "errors.bad_credentials", def: "Benutzername oder Passwort falsch — oder das Konto ist gesperrt." },
  { test: (m) => m.includes("用户已被封禁"), key: "errors.user_banned", def: "Dieses Konto ist deaktiviert." },
  { test: (m) => m.includes("额度已用尽") || m.includes("令牌额度不足") || m.includes("insufficient_token_quota"), key: "errors.token_quota", def: "Token-Limit erreicht." },
  { test: (m) => m.includes("无可用渠道"), key: "errors.no_channel", def: "Für dieses Modell ist kein Anbieter verfügbar." },
  { test: (m) => m.includes("无权进行此操作") || m.includes("未登录"), key: "errors.unauthorized", def: "Nicht angemeldet oder keine Berechtigung." },
  { test: (m) => m.includes("管理员关闭了密码登录"), key: "errors.password_login_disabled", def: "Passwort-Anmeldung ist deaktiviert." },
  { test: (m) => m.includes("budget_exhausted") || m.includes("Budget erschöpft"), key: "errors.budget_exhausted", def: "Budget erschöpft." },
  { test: (m) => m.includes("无法禁用超级管理员"), key: "errors.cannot_disable_root", def: "Der Super-Admin kann nicht deaktiviert werden." },
  { test: (m) => m === "invalid parameter" || m.includes("invalid_parameter"), key: "errors.invalid_input", def: "Ungültige Eingabe." },
];

/** Mappt eine Backend-Fehlermeldung auf eine lokalisierte Anzeige. */
export function apiError(message: string | undefined, t: TFunction): string {
  if (!message) return t("errors.generic", "Es ist ein Fehler aufgetreten.");
  for (const e of MAP) if (e.test(message)) return t(e.key, e.def);
  return message;
}
