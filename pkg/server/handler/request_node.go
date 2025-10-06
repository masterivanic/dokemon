package handler

import (
	"github.com/dokemon-ng/dokemon/pkg/server/model"

	"github.com/labstack/echo/v4"
)

type nodeCreateRequest struct {
	EnvironmentId *uint  `json:"environmentId"`
	Name          string `json:"name" validate:"required,max=50"`
}

func (r *nodeCreateRequest) bind(c echo.Context, m *model.Node) error {
	if err := c.Bind(r); err != nil {
		return err
	}

	if err := c.Validate(r); err != nil {
		return err
	}

	m.Name = r.Name
	m.EnvironmentId = r.EnvironmentId

	return nil
}

type nodeUpdateRequest struct {
	EnvironmentId *uint  `json:"environmentId"`
	Name          string `json:"name" validate:"required,max=50"`
	Id            uint   `json:"id" validate:"required"`
}

func (r *nodeUpdateRequest) bind(c echo.Context, m *model.Node) error {
	if err := c.Bind(r); err != nil {
		return err
	}

	if err := c.Validate(r); err != nil {
		return err
	}

	m.Id = r.Id
	m.Name = r.Name
	m.EnvironmentId = r.EnvironmentId

	return nil
}

type nodeContainerBaseUrlUpdateRequest struct {
	ContainerBaseUrl string `json:"containerBaseUrl" validate:"max=255"`
	Id               uint   `json:"id" validate:"required"`
}

func (r *nodeContainerBaseUrlUpdateRequest) bind(c echo.Context, m *model.Node) error {
	if err := c.Bind(r); err != nil {
		return err
	}

	if err := c.Validate(r); err != nil {
		return err
	}

	m.Id = r.Id
	m.ContainerBaseUrl = &r.ContainerBaseUrl

	return nil
}
