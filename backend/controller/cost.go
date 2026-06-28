package controller

// Die Eine Kette — Kosten-Dashboard (Phase 5): Zusammenfassung extern vs. self-hosted
// + Ledger + CSV-Export. Mandantengescoped (Root = alle, Org-Admin = eigene Org).

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/songquanpeng/one-api/common/ctxkey"
	"github.com/songquanpeng/one-api/common/license"
	"github.com/songquanpeng/one-api/model"
)

// scopeOrg liefert die Org-Einschränkung: 0 = alle (Root), sonst die eigene Org.
func scopeOrg(c *gin.Context) int {
	if c.GetInt(ctxkey.Role) >= model.RoleRootUser {
		return 0
	}
	me, err := model.GetUserById(c.GetInt(ctxkey.Id), false)
	if err != nil {
		return -1 // ungültig → nichts
	}
	if me.OrgId == 0 {
		return -1
	}
	return me.OrgId
}

func sinceFromDays(c *gin.Context) int64 {
	days, _ := strconv.Atoi(c.DefaultQuery("days", "30"))
	if days <= 0 {
		days = 30
	}
	return time.Now().AddDate(0, 0, -days).Unix()
}

func GetCostSummary(c *gin.Context) {
	orgId := scopeOrg(c)
	since := sinceFromDays(c)
	sums, err := model.SumCostBySource(maxZero(orgId), since)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	recent, _ := model.GetCostEntries(maxZero(orgId), 0, 50)
	external := sums["external"]
	selfHosted := sums["self_hosted"]
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"external_micro_eur":    external,
			"self_hosted_micro_eur": selfHosted,
			"total_micro_eur":       external + selfHosted,
			"recent":                recent,
		},
	})
}

func ExportCostCsv(c *gin.Context) {
	// Kommerzielles Feature: Kosten-Export erfordert eine gültige Lizenz mit "cost_export".
	if !license.HasFeature("cost_export") {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Kosten-Export erfordert eine kommerzielle Lizenz (Feature cost_export)."})
		return
	}
	orgId := scopeOrg(c)
	entries, err := model.GetCostEntries(maxZero(orgId), 0, 10000)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", "attachment; filename=die-eine-kette-kosten.csv")
	c.String(http.StatusOK, "created_at,org_id,user_id,channel_id,cost_source,model,prompt_tokens,completion_tokens,request_ms,cost_micro_eur\n")
	for _, e := range entries {
		ts := time.Unix(e.CreatedAt, 0).UTC().Format(time.RFC3339)
		c.String(http.StatusOK, fmt.Sprintf("%s,%d,%d,%d,%s,%s,%d,%d,%d,%d\n",
			ts, e.OrgId, e.UserId, e.ChannelId, e.CostSource, e.Model,
			e.PromptTokens, e.CompletionTokens, e.RequestMs, e.CostMicroEur))
	}
}

// maxZero: -1 (kein Zugriff) → 0-Filter ergibt leer; aber wir wollen bei -1 nichts zeigen.
// SumCostBySource/GetCostEntries filtern bei >0 nach Org; bei -1 nutzen wir eine
// unmögliche Org (sehr großer Wert), damit das Ergebnis leer bleibt.
func maxZero(orgId int) int {
	if orgId < 0 {
		return 1 << 30 // existiert nicht → leeres Ergebnis
	}
	return orgId
}
