package model

type NodeComposeProjectVariable struct {
	NodeComposeProject   NodeComposeProject
	Name                 string `gorm:"size:100"`
	Value                string
	Id                   uint
	NodeComposeProjectId uint
	IsSecret             bool
}
