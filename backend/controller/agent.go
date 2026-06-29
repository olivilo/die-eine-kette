package controller

// Die Eine Kette — Agenten/MCP (Sicherheits-Fundament).
// Verwaltung (root/admin) + agent-authentifizierte MCP-Endpunkte mit Guardrail-Pipeline.

import (
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/songquanpeng/one-api/common/config"
	"github.com/songquanpeng/one-api/common/ctxkey"
	"github.com/songquanpeng/one-api/model"
)

// ── Output-Guardrail: PII/Secret-Redaction (Tool-Ergebnisse sind untrusted) ──
var redactors = []struct {
	re   *regexp.Regexp
	with string
}{
	{regexp.MustCompile(`[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}`), "[redacted-email]"},
	{regexp.MustCompile(`agt-[a-f0-9]{16,}`), "[redacted-key]"},
	{regexp.MustCompile(`sk-[A-Za-z0-9_\-]{16,}`), "[redacted-key]"},
	{regexp.MustCompile(`AKIA[0-9A-Z]{16}`), "[redacted-aws-key]"},
	{regexp.MustCompile(`(?i)bearer\s+[A-Za-z0-9._\-]{16,}`), "[redacted-token]"},
	{regexp.MustCompile(`-----BEGIN [A-Z ]*PRIVATE KEY-----`), "[redacted-private-key]"},
	{regexp.MustCompile(`\b\d{13,16}\b`), "[redacted-number]"},
}

func redactSecrets(s string) (string, int) {
	n := 0
	for _, r := range redactors {
		s = r.re.ReplaceAllStringFunc(s, func(m string) string { n++; return r.with })
	}
	return s, n
}

// ── Guardrail: heuristischer Prompt-Injection-Scanner (EINE Schicht der Defense-in-Depth) ──
var injectionPatterns = []string{
	"ignore previous", "ignore all previous", "ignore the above", "disregard previous",
	"disregard the above", "forget previous", "system prompt", "you are now",
	"new instructions", "override your", "reveal your", "print your instructions",
	"exfiltrate", "send all", "delete all", "drop table", "rm -rf",
	"ignoriere vorherige", "vergiss alle", "systemanweisung",
}

func scanForInjection(text string) (blocked bool, reason string) {
	low := strings.ToLower(text)
	for _, p := range injectionPatterns {
		if strings.Contains(low, p) {
			return true, "Verdacht auf Prompt-Injection: \"" + p + "\""
		}
	}
	return false, ""
}

// authAgent — Agent-Key aus Header X-Agent-Key (oder Bearer). Deny-by-default.
func authAgent(c *gin.Context) (*model.Agent, bool) {
	key := c.GetHeader("X-Agent-Key")
	if key == "" {
		if h := c.GetHeader("Authorization"); strings.HasPrefix(h, "Bearer ") {
			key = strings.TrimPrefix(h, "Bearer ")
		}
	}
	a, err := model.AuthenticateAgent(key)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": err.Error()})
		return nil, false
	}
	return a, true
}

// ── MCP-Endpunkte (agent-authentifiziert) ────────────────────────────────────

// McpTools: liefert NUR die für den Agenten freigegebenen Tools (deny-by-default).
func McpTools(c *gin.Context) {
	a, ok := authAgent(c)
	if !ok {
		return
	}
	tools := []string{}
	for _, t := range strings.Split(a.AllowedTools, ",") {
		if s := strings.TrimSpace(t); s != "" {
			tools = append(tools, s)
		}
	}
	model.RecordAgentAudit(a.Id, a.OrgId, "tools.list", "", true, "")
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"tools": tools, "agent": a.Name, "org_id": a.OrgId}})
}

// McpCall: Guardrail-Pipeline für einen Tool-Aufruf.
func McpCall(c *gin.Context) {
	a, ok := authAgent(c)
	if !ok {
		return
	}
	var req struct {
		Tool  string `json:"tool"`
		Input string `json:"input"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "invalid_parameter"})
		return
	}

	// 1) Rate-Limit (Schutz vor Automatik-Schleifen).
	if a.RateLimitPerMin > 0 && model.RecentAgentCalls(a.Id) >= int64(a.RateLimitPerMin) {
		model.RecordAgentAudit(a.Id, a.OrgId, "tools.call", req.Tool, false, "rate_limit")
		c.JSON(http.StatusTooManyRequests, gin.H{"success": false, "message": "Rate-Limit erreicht."})
		return
	}
	// 2) Tool-Allow-List (deny-by-default).
	if !a.ToolAllowed(req.Tool) {
		model.RecordAgentAudit(a.Id, a.OrgId, "tools.call", req.Tool, false, "tool_not_allowed")
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "Tool nicht freigegeben (deny-by-default)."})
		return
	}
	// 3) Injection-Guardrail (untrusted input).
	if blocked, reason := scanForInjection(req.Input); blocked {
		model.RecordAgentAudit(a.Id, a.OrgId, "tools.call", req.Tool, false, reason)
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": reason})
		return
	}

	// 4) Human-in-the-Loop: riskante Tools warten auf menschliche Freigabe.
	if a.ConfirmRequired(req.Tool) {
		p := &model.PendingAction{AgentId: a.Id, OrgId: a.OrgId, Tool: req.Tool, Input: req.Input}
		_ = p.Insert()
		model.RecordAgentAudit(a.Id, a.OrgId, "tools.call", req.Tool, false, "needs_confirmation")
		c.JSON(http.StatusAccepted, gin.H{"success": false, "message": "Freigabe erforderlich (Human-in-the-Loop).",
			"data": gin.H{"needs_confirmation": true, "action_id": p.Id}})
		return
	}

	// 5) (Stub) Tool-Ausführung — hier würde der Aufruf gegen das gescopte Tool laufen.
	model.RecordAgentAudit(a.Id, a.OrgId, "tools.call", req.Tool, true, "")
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"tool": req.Tool, "status": "accepted"}})
}

// McpGuard: prüft untrusted content (Tool-Ergebnis / Retrieval) — DER Hauptvektor
// indirekter Prompt-Injection. Blockt Injection-Muster, redactet PII/Secrets.
func McpGuard(c *gin.Context) {
	a, ok := authAgent(c)
	if !ok {
		return
	}
	var req struct {
		Content string `json:"content"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "invalid_parameter"})
		return
	}
	if blocked, reason := scanForInjection(req.Content); blocked {
		model.RecordAgentAudit(a.Id, a.OrgId, "guard", "", false, reason)
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"blocked": true, "reason": reason}})
		return
	}
	redacted, n := redactSecrets(req.Content)
	model.RecordAgentAudit(a.Id, a.OrgId, "guard", "", true, "redacted:"+strconv.Itoa(n))
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"blocked": false, "redacted": redacted, "redactions": n}})
}

// GetPendingAgentActions: offene Freigaben (Human-in-the-Loop) — Admin.
func GetPendingAgentActions(c *gin.Context) {
	p, _ := strconv.Atoi(c.Query("p"))
	if p < 0 {
		p = 0
	}
	rows, err := model.GetPendingActions(0, p*config.ItemsPerPage, config.ItemsPerPage)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": rows})
}

// ApproveAgentAction: menschliche Freigabe/Ablehnung — Admin.
func ApproveAgentAction(c *gin.Context) {
	var req struct {
		ActionId int64 `json:"action_id"`
		Approve  bool  `json:"approve"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "invalid_parameter"})
		return
	}
	status := "denied"
	if req.Approve {
		status = "approved"
	}
	if err := model.DecidePendingAction(req.ActionId, status, c.GetInt(ctxkey.Id)); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": ""})
}

// ── Verwaltung (root/admin) ──────────────────────────────────────────────────

func GetAllAgents(c *gin.Context) {
	p, _ := strconv.Atoi(c.Query("p"))
	if p < 0 {
		p = 0
	}
	agents, err := model.GetAllAgents(p*config.ItemsPerPage, config.ItemsPerPage)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": agents})
}

func AddAgent(c *gin.Context) {
	var a model.Agent
	if err := c.ShouldBindJSON(&a); err != nil || a.Name == "" {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "invalid_parameter"})
		return
	}
	plain, hash := model.GenerateAgentKey()
	a.Id = 0
	a.KeyHash = hash
	if a.RateLimitPerMin <= 0 {
		a.RateLimitPerMin = 60
	}
	if err := a.Insert(); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	// Klartext-Key nur EINMAL zurückgeben.
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": a.Id, "key": plain}})
}

func UpdateAgent(c *gin.Context) {
	var a model.Agent
	if err := c.ShouldBindJSON(&a); err != nil || a.Id == 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "invalid_parameter"})
		return
	}
	if err := a.Update(); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": ""})
}

func DeleteAgent(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := model.DeleteAgentById(id); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": ""})
}

func GetAgentAuditList(c *gin.Context) {
	p, _ := strconv.Atoi(c.Query("p"))
	if p < 0 {
		p = 0
	}
	rows, err := model.GetAgentAudit(0, p*config.ItemsPerPage, config.ItemsPerPage)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": rows})
}
