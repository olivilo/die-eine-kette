package model

// Die Eine Kette — Budgets, Reset & Timer (Phase 4).
// Verwaltungsschicht: Budget je Scope (Org/Gruppe/Nutzer/Token), Reset-Zyklus, harter
// Timer (valid_until) und on_exhaust-Verhalten. Durchsetzung im Relay + Auto-Timer folgt
// mit dem Kosten-Ledger (Phase 5).

import (
	"errors"
	"fmt"
	"time"

	"github.com/songquanpeng/one-api/common/logger"
	"gorm.io/gorm"
)

type Budget struct {
	Id             int    `json:"id"`
	Name           string `json:"name" gorm:"index"`
	Scope          string `json:"scope" gorm:"type:varchar(20);index"` // organization|group|user|token
	Ref            string `json:"ref" gorm:"type:varchar(64);index"`   // Org-Name | Gruppe | Username | Token-Id
	AmountMicroEur int64  `json:"amount_micro_eur" gorm:"bigint;default:0"`
	UsedMicroEur   int64  `json:"used_micro_eur" gorm:"bigint;default:0"`
	Period         string `json:"period" gorm:"type:varchar(16);default:'none'"`       // none|daily|weekly|monthly
	OnExhaust      string `json:"on_exhaust" gorm:"type:varchar(16);default:'block'"`  // block|warn|downgrade
	ResetAt        int64  `json:"reset_at" gorm:"bigint;default:0"`
	ValidUntil     int64  `json:"valid_until" gorm:"bigint;default:0"`
	Status         int    `json:"status" gorm:"type:int;default:1"` // 1 aktiv, 2 deaktiviert
	CreatedTime    int64  `json:"created_time" gorm:"bigint"`
}

const (
	BudgetStatusEnabled  = 1
	BudgetStatusDisabled = 2
)

// nextResetFrom berechnet den nächsten Reset-Zeitpunkt ab base für die Periode.
func nextResetFrom(base time.Time, period string) int64 {
	switch period {
	case "daily":
		return base.AddDate(0, 0, 1).Unix()
	case "weekly":
		return base.AddDate(0, 0, 7).Unix()
	case "monthly":
		return base.AddDate(0, 1, 0).Unix()
	default:
		return 0
	}
}

func GetAllBudgets(startIdx int, num int) ([]*Budget, error) {
	var budgets []*Budget
	err := DB.Order("id desc").Limit(num).Offset(startIdx).Find(&budgets).Error
	return budgets, err
}

// GetOrgBudgets liefert nur die Budgets EINER Organisation (Scope "organization",
// Ref = Org-Name) — für die org-scoped Verwaltung durch Org-Admins.
func GetOrgBudgets(orgName string, startIdx int, num int) ([]*Budget, error) {
	var budgets []*Budget
	err := DB.Where("scope = ? AND ref = ?", "organization", orgName).
		Order("id desc").Limit(num).Offset(startIdx).Find(&budgets).Error
	return budgets, err
}

func GetBudgetById(id int) (*Budget, error) {
	if id == 0 {
		return nil, errors.New("id ist leer")
	}
	b := Budget{Id: id}
	err := DB.First(&b, "id = ?", id).Error
	return &b, err
}

func (b *Budget) Insert() error {
	b.CreatedTime = time.Now().Unix()
	if b.ResetAt == 0 {
		b.ResetAt = nextResetFrom(time.Now(), b.Period)
	}
	return DB.Create(b).Error
}

func DeleteBudgetById(id int) error {
	if id == 0 {
		return errors.New("id ist leer")
	}
	return DB.Delete(&Budget{Id: id}).Error
}

// budgetWarnThresholds — Prozentschwellen, ab denen beim Burndown gewarnt wird.
var budgetWarnThresholds = []int64{75, 90}

// AddBudgetUsage bucht Kosten (Micro-Euro) auf passende aktive Budgets (Burndown).
// Aktuell: Scope user (ref=Username) und organization (ref=Org-Name). Best-effort.
func AddBudgetUsage(costMicroEur int64, orgId int, username string) {
	if costMicroEur <= 0 {
		return
	}
	if username != "" {
		applyBudgetUsage("user", username, costMicroEur)
	}
	if orgId != 0 {
		var org Organization
		if err := DB.Select("name").First(&org, "id = ?", orgId).Error; err == nil && org.Name != "" {
			applyBudgetUsage("organization", org.Name, costMicroEur)
		}
	}
}

// applyBudgetUsage bucht Kosten auf alle passenden aktiven Budgets, warnt beim
// erstmaligen Überschreiten der Schwellen (75/90 %) und stoppt bei Erschöpfung
// automatisch (on_exhaust=block → Budget deaktivieren = Auto-Stop).
func applyBudgetUsage(scope, ref string, costMicroEur int64) {
	var budgets []Budget
	if err := DB.Where("status = ? AND scope = ? AND ref = ?", BudgetStatusEnabled, scope, ref).Find(&budgets).Error; err != nil {
		return
	}
	for i := range budgets {
		b := &budgets[i]
		before := b.UsedMicroEur
		after := before + costMicroEur
		DB.Model(b).UpdateColumn("used_micro_eur", gorm.Expr("used_micro_eur + ?", costMicroEur))

		if b.AmountMicroEur <= 0 {
			continue // kein Limit gesetzt: nur mitzählen, keine Schwelle/Stop
		}

		// Schwellen-Warnungen (nur beim erstmaligen Überschreiten je Schwelle).
		for _, th := range budgetWarnThresholds {
			mark := b.AmountMicroEur * th / 100
			if before < mark && after >= mark {
				logger.SysError(fmt.Sprintf("Budget '%s' (%s:%s) hat %d%% erreicht (%.2f/%.2f €).",
					b.Name, scope, ref, th, float64(after)/1e6, float64(b.AmountMicroEur)/1e6))
			}
		}

		// Auto-Stop bei Erschöpfung (erstmaliges Überschreiten von 100 %).
		if before < b.AmountMicroEur && after >= b.AmountMicroEur {
			switch b.OnExhaust {
			case "warn":
				logger.SysError(fmt.Sprintf("Budget '%s' (%s:%s) erschöpft (on_exhaust=warn — bleibt offen).", b.Name, scope, ref))
			case "downgrade":
				logger.SysError(fmt.Sprintf("Budget '%s' (%s:%s) erschöpft → Downgrade (Durchsetzung im Relay).", b.Name, scope, ref))
			default: // "block"
				DB.Model(b).Update("status", BudgetStatusDisabled)
				logger.SysError(fmt.Sprintf("Budget '%s' (%s:%s) erschöpft → AUTO-STOP (deaktiviert).", b.Name, scope, ref))
			}
		}
	}
}

// IsScopeBudgetExhausted prüft, ob für den Nutzer (oder seine Organisation) ein Budget mit
// on_exhaust=block erschöpft ist (used >= amount). Für die harte Sperre VOR dem Request.
func IsScopeBudgetExhausted(userId int) (bool, string) {
	user, err := GetUserById(userId, false)
	if err != nil {
		return false, ""
	}
	const cond = "on_exhaust = ? AND amount_micro_eur > 0 AND used_micro_eur >= amount_micro_eur AND scope = ? AND ref = ?"
	var b Budget
	if err := DB.Where(cond, "block", "user", user.Username).First(&b).Error; err == nil {
		return true, b.Name
	}
	if user.OrgId != 0 {
		var org Organization
		if err := DB.Select("name").First(&org, "id = ?", user.OrgId).Error; err == nil && org.Name != "" {
			if err := DB.Where(cond, "block", "organization", org.Name).First(&b).Error; err == nil {
				return true, b.Name
			}
		}
	}
	return false, ""
}

// ResetDueBudgets setzt periodische Budgets zurück, deren reset_at fällig ist:
// nullt den Verbrauch, reaktiviert auto-gestoppte Budgets und plant den nächsten Reset.
func ResetDueBudgets() {
	now := time.Now().Unix()
	var due []Budget
	if err := DB.Where("period <> ? AND reset_at > 0 AND reset_at <= ?", "none", now).Find(&due).Error; err != nil {
		return
	}
	for i := range due {
		b := &due[i]
		if err := b.Reset(); err != nil {
			logger.SysError(fmt.Sprintf("Budget-Reset fehlgeschlagen (%s): %v", b.Name, err))
		} else {
			logger.SysLog(fmt.Sprintf("Budget '%s' periodisch zurückgesetzt (Periode %s).", b.Name, b.Period))
		}
	}
}

// BudgetMaintenanceLoop läuft periodisch (Master-Node): fällige Resets ausführen und
// harte Timer (valid_until) durchsetzen. Blockiert — als Goroutine starten.
func BudgetMaintenanceLoop(intervalSeconds int) {
	if intervalSeconds <= 0 {
		intervalSeconds = 60
	}
	ticker := time.NewTicker(time.Duration(intervalSeconds) * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		DisableExpiredBudgets()
		ResetDueBudgets()
	}
}

// DisableExpiredBudgets deaktiviert Budgets, deren harter Timer (valid_until) abgelaufen ist.
func DisableExpiredBudgets() {
	now := time.Now().Unix()
	DB.Model(&Budget{}).
		Where("status = ? AND valid_until > 0 AND valid_until < ?", BudgetStatusEnabled, now).
		Update("status", BudgetStatusDisabled)
}

// Reset setzt den Verbrauch auf 0, reaktiviert ein evtl. per Auto-Stop deaktiviertes
// Budget und plant den nächsten Reset (für Periode).
func (b *Budget) Reset() error {
	b.UsedMicroEur = 0
	b.Status = BudgetStatusEnabled
	b.ResetAt = nextResetFrom(time.Now(), b.Period)
	return DB.Model(b).Where("id = ?", b.Id).
		Updates(map[string]interface{}{"used_micro_eur": 0, "status": BudgetStatusEnabled, "reset_at": b.ResetAt}).Error
}
