package model

// Die Eine Kette — Agenten/MCP (Sicherheits-Fundament).
// Prinzipien: deny-by-default, Least-Privilege (Agent erbt nie mehr als der
// delegierende Nutzer), Kill-Switch, Rate-Limit, lückenloses Audit. Defense-in-Depth
// gegen Automatismus-Missbrauch und unbekannte 0-Days.

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"
	"time"
)

const (
	AgentStatusEnabled  = 1
	AgentStatusDisabled = 2 // Kill-Switch
)

type Agent struct {
	Id              int    `json:"id"`
	Name            string `json:"name" gorm:"index"`
	OrgId           int    `json:"org_id" gorm:"index"`
	OwnerUserId     int    `json:"owner_user_id" gorm:"index"` // delegierender Nutzer — Obergrenze der Rechte
	KeyHash         string `json:"-" gorm:"type:varchar(64);uniqueIndex"`
	Status          int    `json:"status" gorm:"type:int;default:1"`
	AllowedTools    string `json:"allowed_tools" gorm:"type:text"`  // komma-Liste, leer = nichts (deny-by-default)
	AllowedModels   string `json:"allowed_models" gorm:"type:text"` // komma-Liste, leer = nichts
	RateLimitPerMin int    `json:"rate_limit_per_min" gorm:"type:int;default:60"`
	CreatedTime     int64  `json:"created_time" gorm:"bigint"`
	LastUsedTime    int64  `json:"last_used_time" gorm:"bigint"`
}

// AgentAudit — jede Agenten-Aktion (erlaubt/blockiert) wird protokolliert.
type AgentAudit struct {
	Id        int64  `json:"id"`
	AgentId   int    `json:"agent_id" gorm:"index"`
	OrgId     int    `json:"org_id" gorm:"index"`
	Action    string `json:"action"` // tools.list | tools.call
	Tool      string `json:"tool"`
	Allowed   bool   `json:"allowed"`
	Reason    string `json:"reason"`
	CreatedAt int64  `json:"created_at" gorm:"bigint;index"`
}

func hashAgentKey(key string) string {
	s := sha256.Sum256([]byte(strings.TrimSpace(key)))
	return hex.EncodeToString(s[:])
}

// GenerateAgentKey: kryptografisch zufälliger Key; nur der Hash wird gespeichert.
func GenerateAgentKey() (plain string, hash string) {
	b := make([]byte, 24)
	_, _ = rand.Read(b)
	plain = "agt-" + hex.EncodeToString(b)
	return plain, hashAgentKey(plain)
}

func GetAllAgents(startIdx, num int) ([]*Agent, error) {
	var agents []*Agent
	err := DB.Order("id desc").Limit(num).Offset(startIdx).Find(&agents).Error
	return agents, err
}

func GetAgentById(id int) (*Agent, error) {
	if id == 0 {
		return nil, errors.New("id ist leer")
	}
	a := Agent{Id: id}
	err := DB.First(&a, "id = ?", id).Error
	return &a, err
}

// AuthenticateAgent: löst einen Agent-Key zum (aktiven) Agenten auf. Deny-by-default.
func AuthenticateAgent(key string) (*Agent, error) {
	if key == "" {
		return nil, errors.New("kein Agent-Key")
	}
	var a Agent
	if err := DB.First(&a, "key_hash = ?", hashAgentKey(key)).Error; err != nil {
		return nil, errors.New("ungültiger Agent-Key")
	}
	if a.Status != AgentStatusEnabled {
		return nil, errors.New("Agent ist deaktiviert (Kill-Switch)")
	}
	DB.Model(&Agent{}).Where("id = ?", a.Id).Update("last_used_time", time.Now().Unix())
	return &a, nil
}

func (a *Agent) Insert() error {
	a.CreatedTime = time.Now().Unix()
	a.Status = AgentStatusEnabled
	return DB.Create(a).Error
}

func (a *Agent) Update() error {
	return DB.Model(a).Where("id = ?", a.Id).
		Select("name", "status", "allowed_tools", "allowed_models", "rate_limit_per_min", "owner_user_id", "org_id").
		Updates(a).Error
}

func DeleteAgentById(id int) error {
	if id == 0 {
		return errors.New("id ist leer")
	}
	return DB.Delete(&Agent{Id: id}).Error
}

// ToolAllowed: deny-by-default Prüfung gegen die Allow-List des Agenten.
func (a *Agent) ToolAllowed(tool string) bool {
	tool = strings.TrimSpace(tool)
	if tool == "" || a.AllowedTools == "" {
		return false
	}
	for _, t := range strings.Split(a.AllowedTools, ",") {
		if strings.TrimSpace(t) == tool {
			return true
		}
	}
	return false
}

// RecordAgentAudit: lückenloses Audit (best-effort).
func RecordAgentAudit(agentId, orgId int, action, tool string, allowed bool, reason string) {
	_ = DB.Create(&AgentAudit{
		AgentId: agentId, OrgId: orgId, Action: action, Tool: tool,
		Allowed: allowed, Reason: reason, CreatedAt: time.Now().Unix(),
	}).Error
}

func GetAgentAudit(orgId, startIdx, num int) ([]*AgentAudit, error) {
	var rows []*AgentAudit
	q := DB.Order("id desc").Limit(num).Offset(startIdx)
	if orgId > 0 {
		q = q.Where("org_id = ?", orgId)
	}
	err := q.Find(&rows).Error
	return rows, err
}

// RecentAgentCalls: einfache Rate-Limit-Hilfe (Anzahl Calls in den letzten 60s).
func RecentAgentCalls(agentId int) int64 {
	var n int64
	since := time.Now().Add(-60 * time.Second).Unix()
	DB.Model(&AgentAudit{}).Where("agent_id = ? AND created_at >= ?", agentId, since).Count(&n)
	return n
}
