package controller

// Die Eine Kette — Budgets (Phase 4): Verwaltung (CRUD + manueller Reset).
// Root verwaltet ALLE Budgets (jeder Scope). Org-Admins (Rolle < Root, aber mit OrgId)
// verwalten NUR organisationsbezogene Budgets ihrer EIGENEN Organisation (Scope
// "organization", Ref = Org-Name). Reine System-Admins ohne OrgId haben keinen Zugriff.

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/songquanpeng/one-api/common/config"
	"github.com/songquanpeng/one-api/common/ctxkey"
	"github.com/songquanpeng/one-api/model"
)

var validScopes = map[string]bool{"organization": true, "group": true, "user": true, "token": true}
var validPeriods = map[string]bool{"none": true, "daily": true, "weekly": true, "monthly": true}
var validOnExhaust = map[string]bool{"block": true, "warn": true, "downgrade": true}

// budgetScope ermittelt den Berechtigungsrahmen des Aufrufers.
// isRoot=true → Vollzugriff. Sonst orgName gesetzt → nur eigene Org. ok=false → verweigert
// (Antwort ist bereits geschrieben).
func budgetScope(c *gin.Context) (orgName string, isRoot bool, ok bool) {
	if c.GetInt(ctxkey.Role) >= model.RoleRootUser {
		return "", true, true
	}
	me, err := model.GetUserById(c.GetInt(ctxkey.Id), false)
	if err != nil || me.OrgId == 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Kein Zugriff auf die Budget-Verwaltung."})
		return "", false, false
	}
	org, err := model.GetOrganizationById(me.OrgId)
	if err != nil || org.Name == "" {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Kein Zugriff auf die Budget-Verwaltung."})
		return "", false, false
	}
	return org.Name, false, true
}

// ownsBudget prüft für Nicht-Root, dass das Budget zur eigenen Organisation gehört.
func ownsBudget(b *model.Budget, orgName string) bool {
	return b.Scope == "organization" && b.Ref == orgName
}

func GetAllBudgets(c *gin.Context) {
	orgName, isRoot, ok := budgetScope(c)
	if !ok {
		return
	}
	p, _ := strconv.Atoi(c.Query("p"))
	if p < 0 {
		p = 0
	}
	model.DisableExpiredBudgets() // harte Timer (valid_until) durchsetzen
	var budgets []*model.Budget
	var err error
	if isRoot {
		budgets, err = model.GetAllBudgets(p*config.ItemsPerPage, config.ItemsPerPage)
	} else {
		budgets, err = model.GetOrgBudgets(orgName, p*config.ItemsPerPage, config.ItemsPerPage)
	}
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": budgets})
}

func AddBudget(c *gin.Context) {
	orgName, isRoot, ok := budgetScope(c)
	if !ok {
		return
	}
	var b model.Budget
	if err := c.ShouldBindJSON(&b); err != nil || b.Name == "" {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "invalid_parameter"})
		return
	}
	// Org-Admins dürfen ausschließlich Budgets ihrer eigenen Organisation anlegen —
	// Scope/Ref werden erzwungen, damit sie keine fremden oder anders-scoped Budgets erstellen.
	if !isRoot {
		b.Scope = "organization"
		b.Ref = orgName
	}
	if !validScopes[b.Scope] {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "ungültiger Scope"})
		return
	}
	if b.Period == "" {
		b.Period = "none"
	}
	if !validPeriods[b.Period] {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "ungültige Periode"})
		return
	}
	if b.OnExhaust == "" {
		b.OnExhaust = "block"
	}
	if !validOnExhaust[b.OnExhaust] {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "ungültiges on_exhaust"})
		return
	}
	b.Id = 0
	b.UsedMicroEur = 0
	b.Status = model.BudgetStatusEnabled
	if err := b.Insert(); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": b})
}

func DeleteBudget(c *gin.Context) {
	orgName, isRoot, ok := budgetScope(c)
	if !ok {
		return
	}
	id, _ := strconv.Atoi(c.Param("id"))
	if !isRoot {
		b, err := model.GetBudgetById(id)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
			return
		}
		if !ownsBudget(b, orgName) {
			c.JSON(http.StatusOK, gin.H{"success": false, "message": "Kein Zugriff auf dieses Budget."})
			return
		}
	}
	if err := model.DeleteBudgetById(id); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": ""})
}

func ResetBudget(c *gin.Context) {
	orgName, isRoot, ok := budgetScope(c)
	if !ok {
		return
	}
	id, _ := strconv.Atoi(c.Param("id"))
	b, err := model.GetBudgetById(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	if !isRoot && !ownsBudget(b, orgName) {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Kein Zugriff auf dieses Budget."})
		return
	}
	if err := b.Reset(); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": ""})
}
