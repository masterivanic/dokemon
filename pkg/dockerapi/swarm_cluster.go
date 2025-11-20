package dockerapi

import (
	"context"
	"fmt"
	"strings"

	"github.com/docker/docker/api/types/swarm"
	"github.com/docker/docker/client"
	"github.com/dokemon-ng/dokemon/pkg/util"
)

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
		tlsInfo = fmt.Sprintf("TrustRoot: %s", util.ShortenString(clusterInfo.TLSInfo.TrustRoot, 50))

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

func GetSwarmClusterNodesList(req *ClusterSwarmNodeList) (*ClusterSwarmNodeListResponse, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}

	nodes, err := cli.NodeList(context.Background(), swarm.NodeListOptions{
		Filters: req.Filters,
	})
	if err != nil {
		return nil, err
	}

	var nodeList []*SwarmNodeInfo
	for _, node := range nodes {
		nodeInfo := &SwarmNodeInfo{
			ID:           node.ID,
			Name:         node.Description.Hostname,
			Role:         string(node.Spec.Role),
			Engine:       node.Description.Engine.EngineVersion,
			IPAddress:    util.GetNodeIPAddress(node),
			Status:       string(node.Status.State),
			Availability: string(node.Spec.Availability),
		}
		if node.Description.Resources.NanoCPUs != 0 || node.Description.Resources.MemoryBytes != 0 {
			nodeInfo.CPU = node.Description.Resources.NanoCPUs
			nodeInfo.Memory = node.Description.Resources.MemoryBytes
		}
		nodeList = append(nodeList, nodeInfo)
	}
	response := &ClusterSwarmNodeListResponse{
		Nodes: nodeList,
		Count: len(nodeList),
	}
	return response, nil
}

func GetSwarmNodeByID(req *SwarmNodeInfoId) (*SwarmNodeInfoDetailsResponse, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}

	node, _, err := cli.NodeInspectWithRaw(context.Background(), req.Id)
	if err != nil {
		return nil, err
	}
	osInfo := fmt.Sprintf("%s %s", node.Description.Platform.OS, node.Description.Platform.Architecture)
	if node.Description.Platform.OS == "linux" && node.Description.Platform.OS != "" {
		osInfo = fmt.Sprintf("%s %s (%s)", node.Description.Platform.OS, node.Description.Platform.Architecture, node.Description.Platform.OS)
	}
	var labels []string
	for key, value := range node.Spec.Labels {
		labels = append(labels, fmt.Sprintf("%s=%s", key, value))
	}
	plugins := node.Description.Engine.Plugins
	volumeType := "default"
	networkPlugin := "default"

	for _, plugin := range plugins {
		switch plugin.Type {
		case "Volume":
			if plugin.Name != "" {
				volumeType = plugin.Name
			}
		case "Network":
			if len(plugin.Name) > 0 {
				networkPlugin = plugin.Name
			}
		}
	}

	nodeDetails := &SwarmNodeInfoDetailsResponse{
		Name:          node.Description.Hostname,
		OSInfo:        osInfo,
		CPU:           node.Description.Resources.NanoCPUs,
		Memory:        node.Description.Resources.MemoryBytes,
		Version:       node.Description.Engine.EngineVersion,
		VolumeType:    volumeType,
		NetworkPlugin: networkPlugin,
		Role:          string(node.Spec.Role),
		Availability:  string(node.Spec.Availability),
		Status:        string(node.Status.State),
		Labels:        labels,
	}
	return nodeDetails, nil
}
