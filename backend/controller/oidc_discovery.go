package controller

// Die Eine Kette — OIDC-Discovery: lädt das .well-known/openid-configuration eines
// Identity-Providers und liefert die Endpunkte zurück (Auto-Setup, weniger Tippfehler).
// Root-only. Nur HTTPS (kein Klartext-IdP).

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func OidcDiscovery(c *gin.Context) {
	url := strings.TrimSpace(c.Query("url"))
	if url == "" || !strings.HasPrefix(url, "https://") {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Discovery-URL muss mit https:// beginnen."})
		return
	}
	// Bequemlichkeit: wenn nur die Basis-Issuer-URL angegeben wurde, .well-known anhängen.
	if !strings.Contains(url, "/.well-known/") {
		url = strings.TrimRight(url, "/") + "/.well-known/openid-configuration"
	}

	client := http.Client{Timeout: 8 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Discovery nicht erreichbar: " + err.Error()})
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Discovery-Antwort: HTTP " + resp.Status})
		return
	}

	var doc struct {
		Issuer                string `json:"issuer"`
		AuthorizationEndpoint string `json:"authorization_endpoint"`
		TokenEndpoint         string `json:"token_endpoint"`
		UserinfoEndpoint      string `json:"userinfo_endpoint"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&doc); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Kein gültiges JSON-Discovery-Dokument."})
		return
	}
	if doc.AuthorizationEndpoint == "" || doc.TokenEndpoint == "" {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Discovery-Dokument unvollständig (Endpunkte fehlen)."})
		return
	}
	// Sicherheit: alle Endpunkte müssen HTTPS sein.
	for _, e := range []string{doc.AuthorizationEndpoint, doc.TokenEndpoint, doc.UserinfoEndpoint} {
		if e != "" && !strings.HasPrefix(e, "https://") {
			c.JSON(http.StatusOK, gin.H{"success": false, "message": "Discovery enthält Nicht-HTTPS-Endpunkte."})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"issuer":                 doc.Issuer,
			"authorization_endpoint": doc.AuthorizationEndpoint,
			"token_endpoint":         doc.TokenEndpoint,
			"userinfo_endpoint":      doc.UserinfoEndpoint,
			"well_known":             url,
		},
	})
}
