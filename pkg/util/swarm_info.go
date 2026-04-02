package util

import (
	"context"

	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/swarm"
	"github.com/docker/docker/client"
)

func ShortenString(s string, maxLen int) string {
	if len(s) > maxLen {
		return s[:maxLen] + "..."
	}
	return s
}

func GetNodeIPAddress(node swarm.Node) string {
	if node.Status.Addr != "" {
		return node.Status.Addr
	}

	if node.ManagerStatus != nil && node.ManagerStatus.Addr != "" {
		return node.ManagerStatus.Addr
	}
	return "Unknown"
}

func CreateNodeFilters(role, status, availability string) filters.Args {
	filterArgs := filters.NewArgs()

	if role != "" {
		filterArgs.Add("role", role)
	}

	if status != "" {
		filterArgs.Add("status", status)
	}

	if availability != "" {
		filterArgs.Add("availability", availability)
	}

	return filterArgs
}

func IsLastManager(cli *client.Client, nodeID string) bool {
	managerCount := 0
	filterArgs := filters.NewArgs()
	filterArgs.Add("role", "manager")
	nodes, err := cli.NodeList(context.Background(), swarm.NodeListOptions{
		Filters: filterArgs,
	})
	if err != nil {
		return false
	}
	for _, node := range nodes {
		if node.Spec.Role == swarm.NodeRoleManager && node.Status.State != swarm.NodeStateDown {
			managerCount++
		}
	}
	return managerCount == 1 && nodes[0].ID == nodeID
}
