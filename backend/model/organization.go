package model

// Die Eine Kette — B2B-Mandanten (Phase 3).
// Organisation = Enterprise-Ebene über den Gruppen. Nutzer werden per OrgId zugeordnet.

import (
	"errors"
	"time"
)

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
