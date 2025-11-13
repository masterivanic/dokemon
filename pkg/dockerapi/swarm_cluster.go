package dockerapi

import (
	"context"
	"fmt"
	"strings"

	"github.com/docker/docker/api/types/swarm"
	"github.com/docker/docker/client"
)

func shortenString(s string, maxLen int) string {
	if len(s) > maxLen {
		return s[:maxLen] + "..."
	}
	return s
}

func GetSwarmClusterInfo() (*ClusterInfo, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}

	clusterInfo, err := cli.SwarmInspect(context.Background())
	if err != nil {
		return nil, err
	}

	nodes, err := cli.NodeList(context.Background(), swarm.NodeListOptions{})
	if err != nil {
		return nil, err
	}

	var managerCount, workerCount int
	for _, node := range nodes {
		switch node.Spec.Role {
		case swarm.NodeRoleManager:
			managerCount++
		case swarm.NodeRoleWorker:
			workerCount++
		}
	}

	tlsInfo := "Disabled"
	if clusterInfo.TLSInfo.TrustRoot != "" {
		tlsInfo = fmt.Sprintf("TrustRoot: %s", shortenString(clusterInfo.TLSInfo.TrustRoot, 50))
	}

	var specInfo strings.Builder
	if clusterInfo.Spec.Annotations.Name != "" {
		specInfo.WriteString(fmt.Sprintf("Name: %s", clusterInfo.Spec.Annotations.Name))
	}

	response := &ClusterInfo{
		ID:                     clusterInfo.ID,
		Name:                   clusterInfo.Spec.Annotations.Name,
		CreatedAt:              clusterInfo.Meta.CreatedAt.String(),
		UpdatedAt:              clusterInfo.Meta.UpdatedAt.String(),
		Version:                fmt.Sprintf("Index: %d", clusterInfo.Meta.Version.Index),
		TLSInfo:                tlsInfo,
		RootRotationInProgress: clusterInfo.RootRotationInProgress,
		DefaultAddrPool:        clusterInfo.DefaultAddrPool,
		SubnetSize:             clusterInfo.SubnetSize,
		DataPathPort:           clusterInfo.DataPathPort,
		Spec:                   specInfo.String(),
		NodeCount:              len(nodes),
		ManagerCount:           managerCount,
		WorkerCount:            workerCount,
	}

	return response, nil
}
