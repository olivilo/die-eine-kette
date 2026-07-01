package model

// Die Eine Kette — B2B-Mandanten (Phase 3).
// Organisation = Enterprise-Ebene über den Gruppen. Nutzer werden per OrgId zugeordnet.

import (
	"errors"
	"fmt"
	"time"

	"github.com/songquanpeng/one-api/common"
	"github.com/songquanpeng/one-api/common/config"
)

// orgUsernames liefert die Usernamen aller Nutzer eines Mandanten als Slice.
// Über diesen Slice werden Logs/Statistiken auf die eigene Org eingegrenzt (Mandanten-
// Isolation), ohne über DB-Verbindungsgrenzen (DB vs. LOG_DB) hinweg zu joinen.
func orgUsernames(orgId int) []string {
	var usernames []string
	DB.Model(&User{}).Where("org_id = ?", orgId).Pluck("username", &usernames)
	return usernames
}

type Organization struct {
	Id          int    `json:"id"`
	Name        string `json:"name" gorm:"uniqueIndex" validate:"required,max=40"`
	Status      int    `json:"status" gorm:"type:int;default:1"` // 1 = aktiv, 2 = deaktiviert
	CreatedTime int64  `json:"created_time" gorm:"bigint"`
}

const (
	OrgStatusEnabled  = 1
	OrgStatusDisabled = 2
)

// CountOrganizations / CountActiveUsers — für Lizenz-Limits (max_orgs / max_seats).
func CountOrganizations() int64 {
	var n int64
	DB.Model(&Organization{}).Count(&n)
	return n
}

func CountActiveUsers() int64 {
	var n int64
	DB.Model(&User{}).Where("status != ?", UserStatusDeleted).Count(&n)
	return n
}

func GetAllOrganizations(startIdx int, num int) ([]*Organization, error) {
	var orgs []*Organization
	err := DB.Order("id desc").Limit(num).Offset(startIdx).Find(&orgs).Error
	return orgs, err
}

func GetOrganizationById(id int) (*Organization, error) {
	if id == 0 {
		return nil, errors.New("id ist leer")
	}
	org := Organization{Id: id}
	err := DB.First(&org, "id = ?", id).Error
	return &org, err
}

func (org *Organization) Insert() error {
	org.CreatedTime = time.Now().Unix()
	return DB.Create(org).Error
}

func (org *Organization) Update() error {
	return DB.Model(org).Select("name", "status").Updates(org).Error
}

func DeleteOrganizationById(id int) error {
	if id == 0 {
		return errors.New("id ist leer")
	}
	// Zugeordnete Nutzer lösen (org_id zurück auf 0), dann Organisation löschen.
	if err := DB.Model(&User{}).Where("org_id = ?", id).Update("org_id", 0).Error; err != nil {
		return err
	}
	return DB.Delete(&Organization{Id: id}).Error
}

// CountUsersInOrg liefert die Anzahl zugeordneter (nicht gelöschter) Nutzer.
func CountUsersInOrg(id int) int64 {
	var n int64
	DB.Model(&User{}).Where("org_id = ? AND status != ?", id, UserStatusDeleted).Count(&n)
	return n
}

// GetUsersInOrg liefert die Nutzer eines Mandanten (für Mandanten-Isolation der Admin-Sicht).
func GetUsersInOrg(orgId int, startIdx int, num int) ([]*User, error) {
	var users []*User
	err := DB.Limit(num).Offset(startIdx).Omit("password").
		Where("status != ? AND org_id = ?", UserStatusDeleted, orgId).
		Order("id desc").Find(&users).Error
	return users, err
}

// GetOrgLogs liefert die Logs aller Nutzer eines Mandanten (Mandanten-Isolation Admin-Sicht).
func GetOrgLogs(orgId int, logType int, startTimestamp int64, endTimestamp int64, modelName string, tokenName string, startIdx int, num int) ([]*Log, error) {
	usernames := DB.Model(&User{}).Select("username").Where("org_id = ?", orgId)
	tx := DB.Where("username IN (?)", usernames)
	if logType != 0 {
		tx = tx.Where("type = ?", logType)
	}
	if modelName != "" {
		tx = tx.Where("model_name = ?", modelName)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if startTimestamp != 0 {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}
	var logs []*Log
	err := tx.Order("id desc").Limit(num).Offset(startIdx).Find(&logs).Error
	return logs, err
}

// SearchOrgLogs durchsucht nur die Logs der eigenen Organisation (Mandanten-Isolation
// der Admin-Suche). Spiegelt SearchAllLogs, aber eingegrenzt auf die Org-Nutzer.
func SearchOrgLogs(orgId int, keyword string) ([]*Log, error) {
	usernames := orgUsernames(orgId)
	if len(usernames) == 0 {
		return []*Log{}, nil
	}
	var logs []*Log
	err := LOG_DB.Where("username IN ?", usernames).
		Where("type = ? or content LIKE ?", keyword, keyword+"%").
		Order("id desc").Limit(config.MaxRecentItems).Find(&logs).Error
	return logs, err
}

// SumUsedQuotaByOrg summiert den Verbrauch nur für die eigene Organisation.
func SumUsedQuotaByOrg(orgId int, logType int, startTimestamp int64, endTimestamp int64, modelName string, username string, tokenName string, channel int) (quota int64) {
	usernames := orgUsernames(orgId)
	if len(usernames) == 0 {
		return 0
	}
	ifnull := "ifnull"
	if common.UsingPostgreSQL {
		ifnull = "COALESCE"
	}
	tx := LOG_DB.Table("logs").Select(fmt.Sprintf("%s(sum(quota),0)", ifnull)).Where("username IN ?", usernames)
	if username != "" {
		tx = tx.Where("username = ?", username)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if startTimestamp != 0 {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}
	if modelName != "" {
		tx = tx.Where("model_name = ?", modelName)
	}
	if channel != 0 {
		tx = tx.Where("channel_id = ?", channel)
	}
	tx.Where("type = ?", LogTypeConsume).Scan(&quota)
	return quota
}

// AssignUserToOrg ordnet einen Nutzer (per Username) einer Organisation zu (0 = keine).
func AssignUserToOrg(username string, orgId int) error {
	if username == "" {
		return errors.New("username ist leer")
	}
	if orgId != 0 {
		if _, err := GetOrganizationById(orgId); err != nil {
			return errors.New("organisation nicht gefunden")
		}
	}
	return DB.Model(&User{}).Where("username = ?", username).Update("org_id", orgId).Error
}
