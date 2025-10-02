package model

import "time"

type Node struct {
	EnvironmentId    *uint
	Environment      *Environment
	TokenHash        *string `gorm:"unique;size:100"`
	LastPing         *time.Time
	ContainerBaseUrl *string `gorm:"size:255"`
	Name             string  `gorm:"unique;size:50"`
	AgentVersion     string  `gorm:"size:20"`
	Architecture     string  `json:"architecture" gorm:"-"`
	Id               uint
}
