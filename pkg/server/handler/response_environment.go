package handler

import (
	"github.com/dokemon-ng/dokemon/pkg/server/model"
)

type environmentResponse struct {
	Name string `json:"name"`
	Id   uint   `json:"id"`
}

func newEnvironmentResponse(m *model.Environment) *environmentResponse {
	return &environmentResponse{Id: m.Id, Name: m.Name}
}

type environmentHead struct {
	Name string `json:"name"`
	Id   uint   `json:"id"`
}

func newEnvironmentHead(m *model.Environment) environmentHead {
	return environmentHead{
		Id:   m.Id,
		Name: m.Name,
	}
}

func newEnvironmentHeadList(rows []model.Environment) []environmentHead {
	headRows := make([]environmentHead, len(rows))
	for i, r := range rows {
		headRows[i] = newEnvironmentHead(&r)
	}
	return headRows
}
