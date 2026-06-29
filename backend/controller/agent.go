package controller

// Die Eine Kette — Agenten/MCP (Sicherheits-Fundament).
// Verwaltung (root/admin) + agent-authentifizierte MCP-Endpunkte mit Guardrail-Pipeline.

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/songquanpeng/one-api/common/config"
	"github.com/songquanpeng/one-api/model"
)

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

	// 4) (Stub) Tool-Ausführung — hier würde der Aufruf gegen das gescopte Tool laufen.
	model.RecordAgentAudit(a.Id, a.OrgId, "tools.call", req.Tool, true, "")
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"tool": req.Tool, "status": "accepted"}})
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
