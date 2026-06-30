package model

import (
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupBudgetTestDB hängt DB an eine frische In-Memory-SQLite mit Budget-Tabelle.
func setupBudgetTestDB(t *testing.T) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
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
