package controller

// Die Eine Kette — Budgets (Phase 4): Verwaltung (CRUD + manueller Reset). Root-only.

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/songquanpeng/one-api/common/config"
	"github.com/songquanpeng/one-api/model"
)

var validScopes = map[string]bool{"organization": true, "group": true, "user": true, "token": true}
var validPeriods = map[string]bool{"none": true, "daily": true, "weekly": true, "monthly": true}
var validOnExhaust = map[string]bool{"block": true, "warn": true, "downgrade": true}

func GetAllBudgets(c *gin.Context) {
	p, _ := strconv.Atoi(c.Query("p"))
	if p < 0 {
		p = 0
	}
	model.DisableExpiredBudgets() // harte Timer (valid_until) durchsetzen
	budgets, err := model.GetAllBudgets(p*config.ItemsPerPage, config.ItemsPerPage)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": budgets})
}

func AddBudget(c *gin.Context) {
	var b model.Budget
	if err := c.ShouldBindJSON(&b); err != nil || b.Name == "" {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "invalid_parameter"})
		return
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
	id, _ := strconv.Atoi(c.Param("id"))
	if err := model.DeleteBudgetById(id); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": ""})
}

func ResetBudget(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	b, err := model.GetBudgetById(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	if err := b.Reset(); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": ""})
}
