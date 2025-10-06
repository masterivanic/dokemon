package model

type Variable struct {
	Name     string `gorm:"unique;size:100"`
	Id       uint
	IsSecret bool
}
