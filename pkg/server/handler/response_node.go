package handler

import (
	"time"

	"github.com/dokemon-ng/dokemon/pkg/server/model"
)

type nodeResponse struct {
	EnvironmentId *uint  `json:"environmentId"`
	Name          string `json:"name"`
	Id            uint   `json:"id"`
}

func newNodeResponse(m *model.Node) *nodeResponse {
	return &nodeResponse{
		Id:            m.Id,
		Name:          m.Name,
		EnvironmentId: m.EnvironmentId,
	}
}

type nodeHead struct {
	ContainerBaseUrl *string `json:"containerBaseUrl"`
	Name             string  `json:"name"`
	AgentVersion     string  `json:"agentVersion"`
	Environment      string  `json:"environment"`
	Id               uint    `json:"id"`
	Online           bool    `json:"online"`
	Registered       bool    `json:"registered"`
}

func newNodeHead(m *model.Node) nodeHead {
	online := false
	if m.LastPing != nil {
		online = m.LastPing.After(time.Now().Add(time.Minute * -2))
	}

	environment := ""
	if m.Environment != nil {
		environment = m.Environment.Name
	}
	return nodeHead{
		Id:               m.Id,
		Name:             m.Name,
		AgentVersion:     m.AgentVersion,
		Environment:      environment,
		Online:           online,
		Registered:       m.LastPing != nil,
		ContainerBaseUrl: m.ContainerBaseUrl,
	}
}

func newNodeHeadList(rows []model.Node) []nodeHead {
	headRows := make([]nodeHead, len(rows))
	for i, r := range rows {
		headRows[i] = newNodeHead(&r)
	}
	return headRows
}

type agentRegistrationTokenResponse struct {
	Token string `json:"token"`
}

func newAgentRegistrationTokenResponse(token string) *agentRegistrationTokenResponse {
	return &agentRegistrationTokenResponse{
		Token: token,
	}
}
