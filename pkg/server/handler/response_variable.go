package handler

import "github.com/dokemon-ng/dokemon/pkg/server/model"

type variableResponse struct {
	Name     string `json:"name"`
	Id       uint   `json:"id"`
	IsSecret bool   `json:"isSecret"`
}

type variableHead struct {
	Values   map[string]string `json:"values"`
	Name     string            `json:"name"`
	Id       uint              `json:"id"`
	IsSecret bool              `json:"isSecret"`
}

func newVariableResponse(m *model.Variable) *variableResponse {
	return &variableResponse{
		Id:       m.Id,
		Name:     m.Name,
		IsSecret: m.IsSecret,
	}
}
