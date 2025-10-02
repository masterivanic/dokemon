package handler

import (
	"github.com/dokemon-ng/dokemon/pkg/server/model"
)

type credentialResponse struct {
	Service  *string `json:"service"`
	UserName *string `json:"userName"`
	Name     string  `json:"name"`
	Type     string  `json:"type"`
	Id       uint    `json:"id"`
}

func newCredentialResponse(m *model.Credential) *credentialResponse {
	return &credentialResponse{
		Id:       m.Id,
		Name:     m.Name,
		Service:  m.Service,
		Type:     m.Type,
		UserName: m.UserName,
	}
}

type credentialHead struct {
	Service  *string `json:"service"`
	UserName *string `json:"userName"`
	Name     string  `json:"name"`
	Type     string  `json:"type"`
	Id       uint    `json:"id"`
}

func newCredentialHead(m *model.Credential) credentialHead {
	return credentialHead{
		Id:       m.Id,
		Name:     m.Name,
		Service:  m.Service,
		Type:     m.Type,
		UserName: m.UserName,
	}
}

func newCredentialHeadList(rows []model.Credential) []credentialHead {
	headRows := make([]credentialHead, len(rows))
	for i, r := range rows {
		headRows[i] = newCredentialHead(&r)
	}
	return headRows
}
