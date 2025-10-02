package handler

import (
	"github.com/dokemon-ng/dokemon/pkg/server/model"

	"github.com/labstack/echo/v4"
)

type environmentCreateRequest struct {
	Name string `json:"name" validate:"required,max=50"`
}

func (r *environmentCreateRequest) bind(c echo.Context, m *model.Environment) error {
	if err := c.Bind(r); err != nil {
		return err
	}

	if err := c.Validate(r); err != nil {
		return err
	}

	m.Name = r.Name

	return nil
}

type environmentUpdateRequest struct {
	Name string `json:"name" validate:"required,max=50"`
	Id   uint   `json:"id" validate:"required"`
}

func (r *environmentUpdateRequest) bind(c echo.Context, m *model.Environment) error {
	if err := c.Bind(r); err != nil {
		return err
	}

	if err := c.Validate(r); err != nil {
		return err
	}

	m.Id = r.Id
	m.Name = r.Name

	return nil
}
