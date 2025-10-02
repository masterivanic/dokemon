package model

type Credential struct {
	Service  *string `gorm:"size:50"`
	UserName *string `gorm:"size:100"`
	Name     string  `gorm:"unique;size:50"`
	Type     string  `gorm:"size:50"`
	Secret   string
	Id       uint
}
