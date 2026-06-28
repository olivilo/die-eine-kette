package model

// Die Eine Kette — Budgets, Reset & Timer (Phase 4).
// Verwaltungsschicht: Budget je Scope (Org/Gruppe/Nutzer/Token), Reset-Zyklus, harter
// Timer (valid_until) und on_exhaust-Verhalten. Durchsetzung im Relay + Auto-Timer folgt
// mit dem Kosten-Ledger (Phase 5).

import (
	"errors"
	"time"
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

// Reset setzt den Verbrauch auf 0 und plant den nächsten Reset (für Periode).
func (b *Budget) Reset() error {
	b.UsedMicroEur = 0
	b.ResetAt = nextResetFrom(time.Now(), b.Period)
	return DB.Model(b).Where("id = ?", b.Id).
		Updates(map[string]interface{}{"used_micro_eur": 0, "reset_at": b.ResetAt}).Error
}
