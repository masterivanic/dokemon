package handler

import (
	"github.com/dokemon-ng/dokemon/pkg/crypto/ske"
	"github.com/dokemon-ng/dokemon/pkg/server/model"

	"github.com/labstack/echo/v4"
)

type nodeComposeProjectVariableCreateRequest struct {
	Name                 string `json:"name" validate:"required,max=100"`
	Value                string `json:"value"`
	NodeComposeProjectId uint   `json:"nodeComposeProjectId"`
	IsSecret             bool   `json:"isSecret"`
}

func (r *nodeComposeProjectVariableCreateRequest) bind(c echo.Context, m *model.NodeComposeProjectVariable) error {
	if err := c.Bind(r); err != nil {
		return err
	}

	if err := c.Validate(r); err != nil {
		return err
	}

	m.NodeComposeProjectId = r.NodeComposeProjectId
	m.Name = r.Name
	m.IsSecret = r.IsSecret

	enryptedValue, err := ske.Encrypt(r.Value)
	if err != nil {
		return err
	}
	m.Value = enryptedValue

	return nil
}

type nodeComposeProjectVariableUpdateRequest struct {
	Name                 string `json:"name" validate:"required,max=100"`
	Value                string `json:"value"`
	Id                   uint   `json:"id" validate:"required"`
	NodeComposeProjectId uint   `json:"nodeComposeProjectId"`
	IsSecret             bool   `json:"isSecret"`
}

func (r *nodeComposeProjectVariableUpdateRequest) bind(c echo.Context, m *model.NodeComposeProjectVariable) error {
	if err := c.Bind(r); err != nil {
		return err
	}

	if err := c.Validate(r); err != nil {
		return err
	}

	m.Id = r.Id
	m.NodeComposeProjectId = r.NodeComposeProjectId
	m.Name = r.Name
	m.IsSecret = r.IsSecret

	enryptedValue, err := ske.Encrypt(r.Value)
	if err != nil {
		return err
	}
	m.Value = enryptedValue

	return nil
}
