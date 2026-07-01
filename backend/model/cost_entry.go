package model

// Die Eine Kette — Kosten-Ledger (Phase 5).
// Je Request eine normalisierte Micro-Euro-Zeile (extern eingekauft ODER self-hosted),
// damit beide Kostenarten in EINER Abrechnung erscheinen und nach Org rollen.

import (
	"time"

	"github.com/songquanpeng/one-api/common/config"
	"github.com/songquanpeng/one-api/common/logger"
)

// Wechselkurs USD→EUR für externe Kosten (Quota ist intern USD-basiert). Später konfigurierbar.
const usdToEur = 0.92

type CostEntry struct {
	Id               int64  `json:"id"`
	OrgId            int    `json:"org_id" gorm:"index"`
	UserId           int    `json:"user_id" gorm:"index"`
	ChannelId        int    `json:"channel_id" gorm:"index"`
	CostSource       string `json:"cost_source" gorm:"type:varchar(16);index"`
	Model            string `json:"model" gorm:"index"`
	PromptTokens     int    `json:"prompt_tokens"`
	CompletionTokens int    `json:"completion_tokens"`
	RequestMs        int    `json:"request_ms"`
	CostMicroEur     int64  `json:"cost_micro_eur" gorm:"bigint;index"`
	CreatedAt        int64  `json:"created_at" gorm:"bigint;index"`
}

// RecordCostEntry berechnet die Kosten eines Requests und schreibt sie ins Ledger.
// Best-effort: Fehler werden geloggt, niemals propagiert (darf den Request nie stören).
func RecordCostEntry(log *Log) {
	defer func() {
		if r := recover(); r != nil {
			logger.SysError("RecordCostEntry panic")
		}
	}()

	costSource := "external"
	var costMicro int64
	var channel Channel
	if log.ChannelId != 0 {
		if err := DB.Select("cost_source", "power_draw_kw", "electricity_eur_per_kwh", "hardware_capex_eur", "hardware_lifetime_hours", "maintenance_eur_per_month", "throughput_ktokens_per_hour").
			First(&channel, "id = ?", log.ChannelId).Error; err == nil && channel.CostSource != "" {
			costSource = channel.CostSource
		}
	}

	totalTokens := log.PromptTokens + log.CompletionTokens
	if costSource == "self_hosted" {
		costMicro = channel.SelfHostedCostMicroEur(totalTokens, log.ElapsedTime)
	} else {
		usd := float64(log.Quota) / config.QuotaPerUnit
		costMicro = int64(usd * usdToEur * 1_000_000)
	}

	orgId := 0
	if log.UserId != 0 {
		var u User
		if err := DB.Select("org_id").First(&u, "id = ?", log.UserId).Error; err == nil {
			orgId = u.OrgId
		}
	}

	entry := CostEntry{
		OrgId: orgId, UserId: log.UserId, ChannelId: log.ChannelId,
		CostSource: costSource, Model: log.ModelName,
		PromptTokens: log.PromptTokens, CompletionTokens: log.CompletionTokens,
		RequestMs: int(log.ElapsedTime), CostMicroEur: costMicro,
		CreatedAt: time.Now().Unix(),
	}
	if err := DB.Create(&entry).Error; err != nil {
		logger.SysError("RecordCostEntry insert: " + err.Error())
	}
	// Burndown: Kosten auf passende Budgets buchen (Phase 4↔5).
	AddBudgetUsage(costMicro, orgId, log.Username)
}

// SumCostBySource summiert Micro-Euro je cost_source (optional Org-/Zeit-gefiltert).
func SumCostBySource(orgId int, since int64) (map[string]int64, error) {
	type row struct {
		CostSource string
		Total      int64
	}
	var rows []row
	q := DB.Model(&CostEntry{}).Select("cost_source, COALESCE(SUM(cost_micro_eur),0) as total")
	if orgId > 0 {
		q = q.Where("org_id = ?", orgId)
	}
	if since > 0 {
		q = q.Where("created_at >= ?", since)
	}
	err := q.Group("cost_source").Scan(&rows).Error
	out := map[string]int64{"external": 0, "self_hosted": 0}
	for _, r := range rows {
		out[r.CostSource] = r.Total
	}
	return out, err
}

// TokenSums — Token-in (Prompt) und Token-out (Completion) je Kostenquelle.
type TokenSums struct {
	Prompt     int64 `json:"prompt"`
	Completion int64 `json:"completion"`
}

// SumTokensBySource summiert Prompt-/Completion-Tokens gruppiert nach Kostenquelle
// (external = beim Anbieter, self_hosted = lokal) seit dem Zeitpunkt `since`.
func SumTokensBySource(orgId int, since int64) (map[string]TokenSums, error) {
	type row struct {
		CostSource string
		Prompt     int64
		Completion int64
	}
	var rows []row
	q := DB.Model(&CostEntry{}).
		Select("cost_source, COALESCE(SUM(prompt_tokens),0) as prompt, COALESCE(SUM(completion_tokens),0) as completion")
	if orgId > 0 {
		q = q.Where("org_id = ?", orgId)
	}
	if since > 0 {
		q = q.Where("created_at >= ?", since)
	}
	err := q.Group("cost_source").Scan(&rows).Error
	out := map[string]TokenSums{"external": {}, "self_hosted": {}}
	for _, r := range rows {
		out[r.CostSource] = TokenSums{Prompt: r.Prompt, Completion: r.Completion}
	}
	return out, err
}

// GetCostEntries liefert die jüngsten Ledger-Zeilen (optional Org-gefiltert).
func GetCostEntries(orgId int, startIdx int, num int) ([]*CostEntry, error) {
	var entries []*CostEntry
	q := DB.Order("id desc").Limit(num).Offset(startIdx)
	if orgId > 0 {
		q = q.Where("org_id = ?", orgId)
	}
	err := q.Find(&entries).Error
	return entries, err
}
