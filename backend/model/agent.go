package model

// Die Eine Kette — Agenten/MCP (Sicherheits-Fundament).
// Prinzipien: deny-by-default, Least-Privilege (Agent erbt nie mehr als der
// delegierende Nutzer), Kill-Switch, Rate-Limit, lückenloses Audit. Defense-in-Depth
// gegen Automatismus-Missbrauch und unbekannte 0-Days.

import (
	"context"
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
	ConfirmTools    string `json:"confirm_tools" gorm:"type:text"`   // Tools, die menschliche Freigabe brauchen (Human-in-the-Loop)
	RateLimitPerMin int    `json:"rate_limit_per_min" gorm:"type:int;default:60"`
	CreatedTime     int64  `json:"created_time" gorm:"bigint"`
	LastUsedTime    int64  `json:"last_used_time" gorm:"bigint"`
}

// PendingAction — Human-in-the-Loop: riskanter Tool-Aufruf wartet auf Freigabe.
type PendingAction struct {
	Id        int64  `json:"id"`
	AgentId   int    `json:"agent_id" gorm:"index"`
	OrgId     int    `json:"org_id" gorm:"index"`
	Tool      string `json:"tool"`
	Input     string `json:"input" gorm:"type:text"`
	Status    string `json:"status" gorm:"type:varchar(16);default:'pending';index"` // pending|approved|denied
	CreatedAt int64  `json:"created_at" gorm:"bigint;index"`
	DecidedAt int64  `json:"decided_at" gorm:"bigint"`
	DecidedBy int    `json:"decided_by"`
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
		Select("name", "status", "allowed_tools", "allowed_models", "confirm_tools", "rate_limit_per_min", "owner_user_id", "org_id").
		Updates(a).Error
}

// ConfirmRequired: braucht der Tool-Aufruf eine menschliche Freigabe?
func (a *Agent) ConfirmRequired(tool string) bool {
	tool = strings.TrimSpace(tool)
	if tool == "" || a.ConfirmTools == "" {
		return false
	}
	for _, t := range strings.Split(a.ConfirmTools, ",") {
		if strings.TrimSpace(t) == tool {
			return true
		}
	}
	return false
}

func (p *PendingAction) Insert() error {
	p.Status = "pending"
	p.CreatedAt = time.Now().Unix()
	return DB.Create(p).Error
}

func GetPendingActions(orgId, startIdx, num int) ([]*PendingAction, error) {
	var rows []*PendingAction
	q := DB.Order("id desc").Limit(num).Offset(startIdx)
	if orgId > 0 {
		q = q.Where("org_id = ?", orgId)
	}
	err := q.Find(&rows).Error
	return rows, err
}

func DecidePendingAction(id int64, status string, by int) error {
	if status != "approved" && status != "denied" {
		return errors.New("ungültiger Status")
	}
	return DB.Model(&PendingAction{}).Where("id = ? AND status = ?", id, "pending").
		Updates(map[string]interface{}{"status": status, "decided_at": time.Now().Unix(), "decided_by": by}).Error
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

// ── Entitlement-Capping: ein Agent erbt NIE mehr als der delegierende Nutzer ──
// Delegation ist widerrufbar: ist der Besitzer gesperrt/gelöscht oder ohne Quota,
// verliert der Agent sofort jeden Zugriff (auch wenn sein Key gültig bleibt).

// CheckDelegation prüft die lebende Vertrauenskette Agent→Besitzer.
func (a *Agent) CheckDelegation() error {
	if a.OwnerUserId == 0 {
		return errors.New("Agent hat keinen Besitzer (Delegation ungültig)")
	}
	owner, err := GetUserById(a.OwnerUserId, false)
	if err != nil || owner == nil {
		return errors.New("Besitzer existiert nicht mehr (Delegation widerrufen)")
	}
	if owner.Status != UserStatusEnabled {
		return errors.New("Besitzer ist gesperrt (Delegation widerrufen)")
	}
	if owner.Quota <= 0 {
		return errors.New("Quota des Besitzers erschöpft")
	}
	// Mandanten-Konsistenz: Agent darf nicht außerhalb der Org des Besitzers wirken.
	if a.OrgId != owner.OrgId {
		return errors.New("Agent-Org weicht von Besitzer-Org ab")
	}
	return nil
}

// EffectiveModels = Schnittmenge(Allow-List des Agenten, Modelle der Besitzer-Gruppe).
// Leere Agent-Allow-List = nichts (deny-by-default), nicht „alles".
func (a *Agent) EffectiveModels(ctx context.Context) ([]string, error) {
	owner, err := GetUserById(a.OwnerUserId, false)
	if err != nil || owner == nil {
		return nil, errors.New("Besitzer existiert nicht mehr")
	}
	ownerModels, err := CacheGetGroupModels(ctx, owner.Group)
	if err != nil {
		return nil, err
	}
	ownerSet := map[string]bool{}
	for _, m := range ownerModels {
		ownerSet[m] = true
	}
	var out []string
	for _, t := range strings.Split(a.AllowedModels, ",") {
		m := strings.TrimSpace(t)
		if m != "" && ownerSet[m] {
			out = append(out, m)
		}
	}
	return out, nil
}

// ModelAllowed: deny-by-default + gecappt auf die Rechte des Besitzers.
func (a *Agent) ModelAllowed(ctx context.Context, model string) bool {
	model = strings.TrimSpace(model)
	if model == "" {
		return false
	}
	eff, err := a.EffectiveModels(ctx)
	if err != nil {
		return false
	}
	for _, m := range eff {
		if m == model {
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
