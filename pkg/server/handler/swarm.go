package handler

import (
	"errors"
	"strconv"

	"github.com/dokemon-ng/dokemon/pkg/dockerapi"
	"github.com/dokemon-ng/dokemon/pkg/messages"
	"github.com/dokemon-ng/dokemon/pkg/util"
	"github.com/labstack/echo/v4"
)

func (h *Handler) GetSwarmClusterInfo(c echo.Context) error {
	res, err := dockerapi.GetSwarmClusterInfo()
	if err != nil {
		return unprocessableEntity(c, err)
	}
	return ok(c, res)
}

func (h *Handler) GetSwarmClusterNodesList(c echo.Context) error {
	role := c.QueryParam("role")
	status := c.QueryParam("status")
	availability := c.QueryParam("availability")

	nodeId, err := strconv.Atoi(c.Param("nodeId"))
	if err != nil {
		return unprocessableEntity(c, errors.New("nodeId should be an integer"))
	}

	filterArgs := util.CreateNodeFilters(role, status, availability)

	req := dockerapi.ClusterSwarmNodeList{
		Filters: filterArgs,
	}

	var response *dockerapi.ClusterSwarmNodeListResponse
	if nodeId == 1 {
		response, err = dockerapi.GetSwarmClusterNodesList(&req)
	} else {
		response, err = messages.ProcessTaskWithResponse[dockerapi.ClusterSwarmNodeList, dockerapi.ClusterSwarmNodeListResponse](uint(nodeId), req, defaultTimeout)
	}

	if err != nil {
		return unprocessableEntity(c, err)
	}
	return ok(c, response)
}
