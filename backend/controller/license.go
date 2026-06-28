package controller

// Die Eine Kette — Lizenz-Status (Phase 6). Liefert Tier/Limits/Features (keine Secrets).

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/songquanpeng/one-api/common/license"
)

func GetLicense(c *gin.Context) {
	l := license.Current()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"tier":        l.Tier,
			"customer":    l.Customer,
			"max_orgs":    l.MaxOrgs,
			"max_seats":   l.MaxSeats,
			"max_nodes":   l.MaxNodes,
			"features":    l.Features,
			"valid_until": l.ValidUntil,
			"valid":       l.Valid,
			"commercial":  l.Valid,
		},
	})
}
