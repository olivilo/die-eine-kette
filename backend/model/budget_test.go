package model

import (
	"fmt"
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupBudgetTestDB hängt DB an eine frische, je Test isolierte In-Memory-SQLite.
func setupBudgetTestDB(t *testing.T) {
	t.Helper()
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&Budget{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	DB = db
}

func seedBudget(t *testing.T, b Budget) *Budget {
	t.Helper()
	if err := DB.Create(&b).Error; err != nil {
		t.Fatalf("seed: %v", err)
	}
	return &b
}

// Erschöpfung mit on_exhaust=block → Auto-Stop (Budget deaktiviert), Verbrauch gebucht.
func TestBudgetBurndown_AutoStopOnBlock(t *testing.T) {
	setupBudgetTestDB(t)
	b := seedBudget(t, Budget{Name: "B", Scope: "user", Ref: "alice", AmountMicroEur: 100, UsedMicroEur: 70, OnExhaust: "block", Status: BudgetStatusEnabled})

	AddBudgetUsage(40, 0, "alice") // 70 -> 110 : überschreitet 75/90/100 %

	var got Budget
	DB.First(&got, b.Id)
	if got.UsedMicroEur != 110 {
		t.Fatalf("used = %d, erwartet 110", got.UsedMicroEur)
	}
	if got.Status != BudgetStatusDisabled {
		t.Fatalf("Auto-Stop fehlt: status = %d, erwartet %d (disabled)", got.Status, BudgetStatusDisabled)
	}
}

// Unter 100 % (nur Schwellen 75/90) → bleibt aktiv.
func TestBudgetBurndown_StaysActiveBelowLimit(t *testing.T) {
	setupBudgetTestDB(t)
	b := seedBudget(t, Budget{Name: "B", Scope: "user", Ref: "bob", AmountMicroEur: 100, UsedMicroEur: 50, OnExhaust: "block", Status: BudgetStatusEnabled})

	AddBudgetUsage(35, 0, "bob") // 50 -> 85 : nur 75 % überschritten, nicht erschöpft

	var got Budget
	DB.First(&got, b.Id)
	if got.Status != BudgetStatusEnabled {
		t.Fatalf("sollte aktiv bleiben, status = %d", got.Status)
	}
}

// Erschöpfung mit on_exhaust=warn → bleibt aktiv (nur Warnung).
func TestBudgetBurndown_WarnKeepsActive(t *testing.T) {
	setupBudgetTestDB(t)
	b := seedBudget(t, Budget{Name: "B", Scope: "user", Ref: "carol", AmountMicroEur: 100, UsedMicroEur: 90, OnExhaust: "warn", Status: BudgetStatusEnabled})

	AddBudgetUsage(50, 0, "carol") // 90 -> 140 : erschöpft, aber on_exhaust=warn

	var got Budget
	DB.First(&got, b.Id)
	if got.Status != BudgetStatusEnabled {
		t.Fatalf("warn sollte aktiv lassen, status = %d", got.Status)
	}
}

// ResetDueBudgets setzt nur fällige periodische Budgets zurück (nicht 'none', nicht zukünftige).
func TestResetDueBudgets(t *testing.T) {
	setupBudgetTestDB(t)
	now := time.Now().Unix()
	// fällig: monatlich, reset_at in der Vergangenheit, auto-gestoppt
	due := seedBudget(t, Budget{Name: "due", Scope: "user", Ref: "a", AmountMicroEur: 100, UsedMicroEur: 100, OnExhaust: "block", Status: BudgetStatusDisabled, Period: "monthly", ResetAt: now - 10})
	// nicht fällig: reset_at in der Zukunft
	future := seedBudget(t, Budget{Name: "future", Scope: "user", Ref: "b", AmountMicroEur: 100, UsedMicroEur: 80, OnExhaust: "block", Status: BudgetStatusEnabled, Period: "monthly", ResetAt: now + 10000})
	// none: nie zurücksetzen
	none := seedBudget(t, Budget{Name: "none", Scope: "user", Ref: "c", AmountMicroEur: 100, UsedMicroEur: 90, OnExhaust: "block", Status: BudgetStatusEnabled, Period: "none", ResetAt: 0})

	ResetDueBudgets()

	var gd, gf, gn Budget
	DB.First(&gd, due.Id)
	DB.First(&gf, future.Id)
	DB.First(&gn, none.Id)
	if gd.UsedMicroEur != 0 || gd.Status != BudgetStatusEnabled || gd.ResetAt <= now {
		t.Fatalf("fälliges Budget nicht korrekt zurückgesetzt: used=%d status=%d reset_at=%d", gd.UsedMicroEur, gd.Status, gd.ResetAt)
	}
	if gf.UsedMicroEur != 80 {
		t.Fatalf("zukünftiges Budget angefasst: used=%d", gf.UsedMicroEur)
	}
	if gn.UsedMicroEur != 90 {
		t.Fatalf("none-Budget angefasst: used=%d", gn.UsedMicroEur)
	}
}

// Reset reaktiviert ein per Auto-Stop deaktiviertes Budget und nullt den Verbrauch.
func TestBudgetReset_Reactivates(t *testing.T) {
	setupBudgetTestDB(t)
	b := seedBudget(t, Budget{Name: "B", Scope: "user", Ref: "dave", AmountMicroEur: 100, UsedMicroEur: 100, OnExhaust: "block", Status: BudgetStatusDisabled, Period: "monthly"})

	if err := b.Reset(); err != nil {
		t.Fatalf("reset: %v", err)
	}
	var got Budget
	DB.First(&got, b.Id)
	if got.Status != BudgetStatusEnabled || got.UsedMicroEur != 0 {
		t.Fatalf("Reset unvollständig: status=%d used=%d", got.Status, got.UsedMicroEur)
	}
}
