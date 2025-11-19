package util

import (
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/swarm"
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
