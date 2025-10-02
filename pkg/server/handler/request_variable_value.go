package handler

import (
	"github.com/dokemon-ng/dokemon/pkg/crypto/ske"
	"github.com/dokemon-ng/dokemon/pkg/server/model"

	"github.com/labstack/echo/v4"
)

type variableCreateOrUpdateRequest struct {
	Value         string `json:"value"`
	VariableId    uint   `json:"variableId" validate:"required"`
	EnvironmentId uint   `json:"environmentId" validate:"required"`
}

func (r *variableCreateOrUpdateRequest) bind(c echo.Context, m *model.VariableValue) error {
	if err := c.Bind(r); err != nil {
		return err
	}

	if err := c.Validate(r); err != nil {
		return err
	}

	m.VariableId = r.VariableId
	m.EnvironmentId = r.EnvironmentId

	enryptedValue, err := ske.Encrypt(r.Value)
	if err != nil {
		return err
	}
	m.Value = enryptedValue

	return nil
}
