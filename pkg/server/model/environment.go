package model

type Environment struct {
	Name string `gorm:"unique;size:50"`
	Id   uint
}
