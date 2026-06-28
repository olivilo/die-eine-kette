package controller

// 2FA (TOTP, RFC 6238) für „Die Eine Kette" — ohne externe Abhängigkeit.

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base32"
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/songquanpeng/one-api/common/ctxkey"
	"github.com/songquanpeng/one-api/model"
)

const totpIssuer = "Die Eine Kette"

// ── TOTP-Secret-Verschlüsselung at-rest (AES-GCM, Schlüssel aus SESSION_SECRET) ──
func totpKey() []byte {
	h := sha256.Sum256([]byte("dek-totp-v1:" + os.Getenv("SESSION_SECRET")))
	return h[:]
}

func encryptSecret(plain string) string {
	if plain == "" {
		return ""
	}
	block, err := aes.NewCipher(totpKey())
	if err != nil {
		return plain
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return plain
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return plain
	}
	ct := gcm.Seal(nonce, nonce, []byte(plain), nil)
	return "enc:" + base64.StdEncoding.EncodeToString(ct)
}

func decryptSecret(stored string) string {
	if !strings.HasPrefix(stored, "enc:") {
		return stored // Legacy/Klartext-Fallback (Abwärtskompatibilität)
	}
	raw, err := base64.StdEncoding.DecodeString(stored[4:])
	if err != nil {
		return ""
	}
	block, err := aes.NewCipher(totpKey())
	if err != nil {
		return ""
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil || len(raw) < gcm.NonceSize() {
		return ""
	}
	nonce, ct := raw[:gcm.NonceSize()], raw[gcm.NonceSize():]
	pt, err := gcm.Open(nil, nonce, ct, nil)
	if err != nil {
		return ""
	}
	return string(pt)
}

var b32 = base32.StdEncoding.WithPadding(base32.NoPadding)

func generateTotpSecret() string {
	b := make([]byte, 20)
	_, _ = rand.Read(b)
	return b32.EncodeToString(b)
}

func totpAt(secret string, t time.Time) string {
	key, err := b32.DecodeString(strings.ToUpper(strings.TrimSpace(secret)))
	if err != nil {
		return ""
	}
	counter := uint64(t.Unix()) / 30
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, counter)
	mac := hmac.New(sha1.New, key)
	mac.Write(buf)
	sum := mac.Sum(nil)
	offset := sum[len(sum)-1] & 0x0f
	code := (uint32(sum[offset]&0x7f) << 24) | (uint32(sum[offset+1]) << 16) |
		(uint32(sum[offset+2]) << 8) | uint32(sum[offset+3])
	return fmt.Sprintf("%06d", code%1000000)
}

// validateTotp prüft den Code mit ±1 Zeitfenster (Uhren-Toleranz).
func validateTotp(secret, code string) bool {
	code = strings.TrimSpace(code)
	if len(code) != 6 || secret == "" {
		return false
	}
	now := time.Now()
	for _, skew := range []time.Duration{0, -30 * time.Second, 30 * time.Second} {
		if subtle.ConstantTimeCompare([]byte(totpAt(secret, now.Add(skew))), []byte(code)) == 1 {
			return true
		}
	}
	return false
}

func provisioningURI(secret, account string) string {
	label := url.PathEscape(totpIssuer + ":" + account)
	q := url.Values{}
	q.Set("secret", secret)
	q.Set("issuer", totpIssuer)
	q.Set("period", "30")
	q.Set("digits", "6")
	q.Set("algorithm", "SHA1")
	return "otpauth://totp/" + label + "?" + q.Encode()
}

func hashBackupCode(c string) string {
	s := sha256.Sum256([]byte(strings.TrimSpace(strings.ToLower(c))))
	return hex.EncodeToString(s[:])
}

func generateBackupCodes(n int) (codes []string, hashes []string) {
	for i := 0; i < n; i++ {
		b := make([]byte, 5)
		_, _ = rand.Read(b)
		c := hex.EncodeToString(b) // 10 Hex-Zeichen
		codes = append(codes, c)
		hashes = append(hashes, hashBackupCode(c))
	}
	return codes, hashes
}

// consumeBackupCode prüft einen Backup-Code und verbraucht ihn (entfernt den Hash).
func consumeBackupCode(user *model.User, code string) bool {
	if user.TotpBackup == "" {
		return false
	}
	target := hashBackupCode(code)
	parts := strings.Split(user.TotpBackup, ",")
	kept := make([]string, 0, len(parts))
	found := false
	for _, h := range parts {
		if !found && subtle.ConstantTimeCompare([]byte(h), []byte(target)) == 1 {
			found = true
			continue
		}
		if h != "" {
			kept = append(kept, h)
		}
	}
	if !found {
		return false
	}
	user.TotpBackup = strings.Join(kept, ",")
	_ = user.SaveTotp()
	return true
}

// ── Handler (selfRoute, erfordern Login-Session) ─────────────────────────────

// TotpSetup erzeugt ein neues (noch nicht aktiviertes) Secret + Provisioning-URL.
func TotpSetup(c *gin.Context) {
	id := c.GetInt(ctxkey.Id)
	user, err := model.GetUserById(id, false)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	// 2FA bereits aktiv? Setup nicht zum Deaktivieren missbrauchen lassen — erst Disable (mit Code).
	if user.TotpEnabled {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "2FA ist bereits aktiv. Bitte zuerst deaktivieren."})
		return
	}
	secret := generateTotpSecret()
	user.TotpSecret = encryptSecret(secret) // verschlüsselt at-rest; Klartext nur in URI/QR
	// TotpEnabled bleibt false (Aktivierung erst nach Code-Bestätigung in TotpEnable).
	if err := user.SaveTotp(); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"secret": secret, "uri": provisioningURI(secret, user.Username)},
	})
}

// TotpEnable aktiviert 2FA nach Verifikation eines Codes und gibt Backup-Codes zurück.
func TotpEnable(c *gin.Context) {
	var req struct {
		Code string `json:"code"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "invalid_parameter"})
		return
	}
	id := c.GetInt(ctxkey.Id)
	user, err := model.GetUserById(id, false)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	if !validateTotp(decryptSecret(user.TotpSecret), req.Code) {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "invalid_totp"})
		return
	}
	codes, hashes := generateBackupCodes(8)
	user.TotpEnabled = true
	user.TotpBackup = strings.Join(hashes, ",")
	if err := user.SaveTotp(); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"backup_codes": codes}})
}

// TotpDisable schaltet 2FA ab (Code oder Backup-Code nötig).
func TotpDisable(c *gin.Context) {
	var req struct {
		Code string `json:"code"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "invalid_parameter"})
		return
	}
	id := c.GetInt(ctxkey.Id)
	user, err := model.GetUserById(id, false)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	if !validateTotp(decryptSecret(user.TotpSecret), req.Code) && !consumeBackupCode(user, req.Code) {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "invalid_totp"})
		return
	}
	user.TotpEnabled = false
	user.TotpSecret = ""
	user.TotpBackup = ""
	if err := user.SaveTotp(); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": ""})
}
