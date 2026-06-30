package model

import (
	"fmt"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupEnforceDB(t *testing.T, models ...interface{}) {
	t.Helper()
	// Eindeutiger In-Memory-DB-Name je Test → Isolation trotz cache=shared.
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(models...); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	DB = db
}

// Harter Token-Cap: read-only Check blockt, wenn das Token-Limit nicht reicht.
func TestCheckTokenQuotaSufficient(t *testing.T) {
	setupEnforceDB(t, &Token{})
	tk := Token{Name: "t", Key: "key-limited", UserId: 1, RemainQuota: 10, UnlimitedQuota: false, Status: TokenStatusEnabled}
	if err := DB.Create(&tk).Error; err != nil {
		t.Fatalf("seed: %v", err)
	}
	if err := CheckTokenQuotaSufficient(tk.Id, 100); err == nil {
		t.Fatal("erwartete Sperre: 100 > remain 10")
	}
	if err := CheckTokenQuotaSufficient(tk.Id, 5); err != nil {
		t.Fatalf("5 <= remain 10 sollte ok sein: %v", err)
	}

	un := Token{Name: "u", Key: "key-unlimited", UserId: 1, RemainQuota: 0, UnlimitedQuota: true, Status: TokenStatusEnabled}
	DB.Create(&un)
	if err := CheckTokenQuotaSufficient(un.Id, 1_000_000); err != nil {
		t.Fatalf("unbegrenztes Token sollte nie blocken: %v", err)
	}
}

// Harte Budget-Sperre: erschöpftes block-Budget (user-scope) blockt den Nutzer.
func TestIsScopeBudgetExhausted(t *testing.T) {
	setupEnforceDB(t, &Budget{}, &User{}, &Organization{})
	u := User{Username: "alice", OrgId: 0, Status: UserStatusEnabled}
	if err := DB.Create(&u).Error; err != nil {
		t.Fatalf("seed user: %v", err)
	}

	// Noch nicht erschöpft → nicht blockiert.
	b := Budget{Name: "B", Scope: "user", Ref: "alice", AmountMicroEur: 100, UsedMicroEur: 50, OnExhaust: "block", Status: BudgetStatusEnabled}
	DB.Create(&b)
	if blocked, _ := IsScopeBudgetExhausted(u.Id); blocked {
		t.Fatal("50/100 sollte nicht blocken")
	}

	// Erschöpft → blockiert (auch wenn per Auto-Stop deaktiviert).
	DB.Model(&b).Updates(map[string]interface{}{"used_micro_eur": 100, "status": BudgetStatusDisabled})
	blocked, name := IsScopeBudgetExhausted(u.Id)
	if !blocked || name != "B" {
		t.Fatalf("erschöpftes block-Budget sollte sperren: blocked=%v name=%q", blocked, name)
	}
}

// Org-Limit-Vererbung: ein erschöpftes ORG-Budget blockt jeden Nutzer der Organisation —
// auch wenn dessen eigenes Nutzer-Budget noch Luft hätte (Deckel auf den Gesamt-Org-Verbrauch).
func TestIsScopeBudgetExhausted_OrgInheritance(t *testing.T) {
	setupEnforceDB(t, &Budget{}, &User{}, &Organization{})
	org := Organization{Name: "OrgA", Status: 1}
	if err := DB.Create(&org).Error; err != nil {
		t.Fatalf("seed org: %v", err)
	}
	u := User{Username: "member1", OrgId: org.Id, Status: UserStatusEnabled}
	DB.Create(&u)

	// Nutzer-Budget des Mitglieds hat noch Luft …
	DB.Create(&Budget{Name: "user-b", Scope: "user", Ref: "member1", AmountMicroEur: 100, UsedMicroEur: 10, OnExhaust: "block", Status: BudgetStatusEnabled})
	// … aber das ORG-Budget ist erschöpft.
	DB.Create(&Budget{Name: "org-b", Scope: "organization", Ref: "OrgA", AmountMicroEur: 100, UsedMicroEur: 100, OnExhaust: "block", Status: BudgetStatusEnabled})

	blocked, name := IsScopeBudgetExhausted(u.Id)
	if !blocked || name != "org-b" {
		t.Fatalf("erschöpftes Org-Budget sollte das Mitglied sperren: blocked=%v name=%q", blocked, name)
	}
}
