package common

import (
	"os"
	"strings"

	"github.com/songquanpeng/one-api/common/logger"
)

// Die Eine Kette — Sicherheits-Preflight.
// Trivial konfigurierte Secrets sind ein häufiger Produktiv-Fehler. Statt nur zu
// warnen (wie Upstream), verweigern wir hier den Start, wenn SESSION_SECRET ein
// Beispiel-/Trivialwert ist. So kann das System nicht versehentlich mit unsicherer
// Session-Signatur erreichbar/an Governance-Systeme angebunden werden.

var weakSessionSecrets = map[string]bool{
	"random_string":  true,
	"session_secret": true,
	"sessionsecret":  true,
	"change_me":      true,
	"changeme":       true,
	"secret":         true,
	"123456":         true,
	"password":       true,
	"example":        true,
}

// SecurityPreflight bricht den Start ab, wenn sicherheitskritische Konfiguration
// trivial ist. Bei fehlendem SESSION_SECRET nur eine Warnung (zufälliges Secret pro
// Start ist sicher, aber nicht persistent/instanz-übergreifend).
func SecurityPreflight() {
	secret := strings.TrimSpace(os.Getenv("SESSION_SECRET"))
	if secret == "" {
		logger.SysError("SESSION_SECRET ist nicht gesetzt — Sessions überleben keinen Neustart und werden nicht zwischen Instanzen geteilt. Für den Produktivbetrieb ein langes Zufalls-Secret setzen (z. B. `openssl rand -hex 32`).")
		return
	}
	if weakSessionSecrets[strings.ToLower(secret)] || len(secret) < 16 {
		logger.FatalLog("SESSION_SECRET ist trivial oder zu kurz (mind. 16 Zeichen, kein Beispielwert). Start abgebrochen. Erzeuge eines mit: openssl rand -hex 32")
	}
}
