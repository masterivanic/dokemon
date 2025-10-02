package model

type User struct {
	UserName     string `gorm:"unique;size:255"`
	PasswordHash string `gorm:"size:255"`
	Id           uint
}
