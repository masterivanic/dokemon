package model

type NodeComposeProject struct {
	LibraryProject     *ComposeLibraryItem
	Credential         *Credential
	Definition         *string
	EnvironmentId      *uint
	Environment        *Environment
	LibraryProjectId   *uint
	LibraryProjectName *string `gorm:"size:50"`
	CredentialId       *uint
	Url                *string `gorm:"size:255"`
	Node               Node
	Type               string `gorm:"size:20,default:''"`
	ProjectName        string `gorm:"size:50"`
	NodeId             uint
	Id                 uint
}
