// Package license — Die Eine Kette: Ed25519-Lizenzprüfung + Feature-Gating.
// Der ÖFFENTLICHE Verifikations-Key ist fest eingebacken; der private Signier-Key
// liegt nur beim Anbieter (Keygen, privater Teil). Offline-fähig, kein Online-Zwang.
package license

import (
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"errors"
	"os"
	"strings"
	"sync"
	"time"
)

// Öffentlicher Root-Verifikations-Key (Ed25519, base64). Paart mit dem privaten
// Signier-Key im privaten Keygen. Austausch = neue Lizenzen nötig.
const PublicKeyB64 = "SRPFW7HuN64XLAVZQDTv1wJNT8EuvbZlc3zX6VadKW4="

type License struct {
	V          int      `json:"v"`
	LicenseId  string   `json:"license_id"`
	Customer   string   `json:"customer"`
	Tier       string   `json:"tier"`
	MaxOrgs    int      `json:"max_orgs"`
	MaxSeats   int      `json:"max_seats"`
	MaxNodes   int      `json:"max_nodes"`
	Features   []string `json:"features"`
	IssuedAt   string   `json:"issued_at"`
	ValidUntil string   `json:"valid_until"`
	Valid      bool     `json:"valid"` // abgeleitet: gültig signiert & nicht abgelaufen
}

var (
	mu      sync.RWMutex
	current *License
)

// community sind die Limits ohne (gültige) Lizenz.
func community() *License {
	return &License{Tier: "community", MaxOrgs: 1, MaxSeats: 5, MaxNodes: 1, Features: []string{}, Valid: false}
}

// Verify prüft Signatur + Ablauf eines Lizenz-Tokens (base64url(payload).base64url(sig)).
func Verify(token string) (*License, error) {
	parts := strings.Split(strings.TrimSpace(token), ".")
	if len(parts) != 2 {
		return nil, errors.New("ungültiges Token-Format")
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, err
	}
	sig, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, err
	}
	pub, err := base64.StdEncoding.DecodeString(PublicKeyB64)
	if err != nil || len(pub) != ed25519.PublicKeySize {
		return nil, errors.New("ungültiger Public-Key")
	}
	if !ed25519.Verify(ed25519.PublicKey(pub), payload, sig) {
		return nil, errors.New("Signatur ungültig")
	}
	var l License
	if err := json.Unmarshal(payload, &l); err != nil {
		return nil, err
	}
	if l.ValidUntil != "" {
		if t, perr := time.Parse(time.RFC3339, l.ValidUntil); perr == nil && time.Now().After(t) {
			return &l, errors.New("Lizenz abgelaufen")
		}
	}
	l.Valid = true
	return &l, nil
}

// Load liest die Lizenz aus DIEEINEKETTE_LICENSE (Token) oder DIEEINEKETTE_LICENSE_FILE.
func Load() {
	token := os.Getenv("DIEEINEKETTE_LICENSE")
	if token == "" {
		if f := os.Getenv("DIEEINEKETTE_LICENSE_FILE"); f != "" {
			if b, err := os.ReadFile(f); err == nil {
				token = strings.TrimSpace(string(b))
			}
		}
	}
	mu.Lock()
	defer mu.Unlock()
	if token == "" {
		current = community()
		return
	}
	l, err := Verify(token)
	if err != nil || !l.Valid {
		current = community()
		return
	}
	current = l
}

func Current() *License {
	mu.RLock()
	defer mu.RUnlock()
	if current == nil {
		return community()
	}
	return current
}

func HasFeature(f string) bool {
	l := Current()
	if !l.Valid {
		return false
	}
	for _, x := range l.Features {
		if x == f {
			return true
		}
	}
	return false
}

func MaxOrgs() int     { return Current().MaxOrgs }
func MaxSeats() int    { return Current().MaxSeats }
func IsCommercial() bool { return Current().Valid }
