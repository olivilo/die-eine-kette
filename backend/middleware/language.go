package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/songquanpeng/one-api/common/i18n"
)

func Language() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set(i18n.ContextKey, resolveLang(c.GetHeader("Accept-Language")))
		c.Next()
	}
}

// resolveLang picks a supported locale (en, de, zh-CN) from an Accept-Language
// header. It scans the comma-separated tags in order and returns the first
// supported match, ignoring quality values; it falls back to English.
func resolveLang(header string) string {
	for _, part := range strings.Split(header, ",") {
		tag := strings.ToLower(strings.TrimSpace(part))
		if i := strings.IndexByte(tag, ';'); i >= 0 { // drop q-value
			tag = tag[:i]
		}
		switch {
		case strings.HasPrefix(tag, "zh"):
			return "zh-CN"
		case strings.HasPrefix(tag, "de"):
			return "de"
		case strings.HasPrefix(tag, "en"):
			return "en"
		}
	}
	return "en"
}
