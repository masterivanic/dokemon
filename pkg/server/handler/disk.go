package handler

import (
	"github.com/dokemon-ng/dokemon/pkg/dockerapi"
	"github.com/labstack/echo/v4"
)

func (h *Handler) GetDiskUsage(c echo.Context) error {
	res, err := dockerapi.GetDiskUsage()
	if err != nil {
		return unprocessableEntity(c, err)
	}
	return ok(c, res)
}

func (h *Handler) PruneBuildCache(c echo.Context) error {
	all := c.QueryParam("all") == "true"
	filtersMap := make(map[string]string)
	req := &dockerapi.BuildCachePruneRequest{
		All:     all,
		Filters: filtersMap,
	}
	res, err := dockerapi.BuildCacheRemove(req)
	if err != nil {
		return unprocessableEntity(c, err)
	}

	return ok(c, res)
}
