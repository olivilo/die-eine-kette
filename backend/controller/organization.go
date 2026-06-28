package controller

// Die Eine Kette — B2B-Mandanten (Phase 3): Organisationen verwalten + Nutzer zuordnen.

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/songquanpeng/one-api/common/config"
	"github.com/songquanpeng/one-api/model"
)

func GetAllOrganizations(c *gin.Context) {
	p, _ := strconv.Atoi(c.Query("p"))
	if p < 0 {
		p = 0
	}
	orgs, err := model.GetAllOrganizations(p*config.ItemsPerPage, config.ItemsPerPage)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	type orgOut struct {
		*model.Organization
		UserCount int64 `json:"user_count"`
	}
	out := make([]orgOut, 0, len(orgs))
	for _, o := range orgs {
		out = append(out, orgOut{o, model.CountUsersInOrg(o.Id)})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": out})
}

func AddOrganization(c *gin.Context) {
	var org model.Organization
	if err := c.ShouldBindJSON(&org); err != nil || org.Name == "" {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "invalid_parameter"})
		return
	}
	org.Id = 0
	org.Status = model.OrgStatusEnabled
	if err := org.Insert(); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": org})
}

func DeleteOrganization(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := model.DeleteOrganizationById(id); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": ""})
}

func AssignUserToOrg(c *gin.Context) {
	var req struct {
		Username string `json:"username"`
		OrgId    int    `json:"org_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "invalid_parameter"})
		return
	}
	if err := model.AssignUserToOrg(req.Username, req.OrgId); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": ""})
}
