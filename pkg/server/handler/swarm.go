package handler

import (
	"github.com/dokemon-ng/dokemon/pkg/dockerapi"
	"github.com/labstack/echo/v4"
)

func (h *Handler) GetSwarmClusterInfo(c echo.Context) error {
	res, err := dockerapi.GetSwarmClusterInfo()
	if err != nil {
		return unprocessableEntity(c, err)
	}
	return ok(c, res)
}
