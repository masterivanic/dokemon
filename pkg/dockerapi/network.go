package dockerapi

import (
	"context"
	"fmt"
	"net"
	"sort"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/client"
)

var validNetworkDrivers = []string{
	"bridge",
	"default",
	"host",
	"overlay",
	"macvlan",
	"ipvlan",
	"none",
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func NetworkCreate(req *DockerNetworkCreate) (*DockerNetworkCreateResponse, error) {
	if req.Name == "" {
		return nil, fmt.Errorf("network name cannot be empty")
	}

	if req.Driver == "" {
		req.Driver = "bridge" // default bridge
	} else if !contains(validNetworkDrivers, req.Driver) {
		return nil, fmt.Errorf("invalid network driver: %s. Valid options are: %v", req.Driver, validNetworkDrivers)
	}

	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, fmt.Errorf("failed to create Docker client: %v", err)
	}

	var ipam *network.IPAM
	if req.IPAM != nil {
		ipam = &network.IPAM{
			Driver: req.IPAM.Driver,
			Config: make([]network.IPAMConfig, len(req.IPAM.Config)),
		}

		for i, pool := range req.IPAM.Config {
			if pool.Subnet != "" {
				if _, _, err := net.ParseCIDR(pool.Subnet); err != nil {
					return nil, fmt.Errorf("invalid subnet format %q: %v", pool.Subnet, err)
				}
			}
			ipam.Config[i] = network.IPAMConfig{
				Subnet:  pool.Subnet,
				Gateway: pool.Gateway,
			}
		}
	}

	resp, err := cli.NetworkCreate(context.Background(), req.Name, network.CreateOptions{
		Driver:     req.Driver,
		Options:    req.Options,
		Labels:     req.Labels,
		IPAM:       ipam,
		Internal:   req.Internal,
		Attachable: req.Attachable,
		Ingress:    req.Ingress,
		EnableIPv6: &req.EnableIPv6,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create network: %v", err)
	}

	return &DockerNetworkCreateResponse{
		ID:      resp.ID,
		Warning: resp.Warning,
	}, nil
}

func NetworkList(req *DockerNetworkList) (*DockerNetworkListResponse, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}

	dcontainers, err := cli.ContainerList(context.Background(), container.ListOptions{All: true})
	if err != nil {
		return nil, err
	}

	usedNetworks := make(map[string]interface{}, 0)
	for _, c := range dcontainers {
		if c.NetworkSettings != nil {
			for _, n := range c.NetworkSettings.Networks {
				usedNetworks[n.NetworkID] = nil
			}
		}
	}

	dnetworks, err := cli.NetworkList(context.Background(), network.ListOptions{})
	if err != nil {
		return nil, err
	}

	networks := make([]Network, len(dnetworks))
	for i, item := range dnetworks {
		_, inUse := usedNetworks[item.ID]
		networks[i] = Network{
			Id:     item.ID,
			Name:   item.Name,
			Driver: item.Driver,
			Scope:  item.Scope,
			InUse:  inUse,
		}
	}

	sort.Slice(networks, func(i, j int) bool {
		return networks[i].Name < networks[j].Name
	})

	return &DockerNetworkListResponse{Items: networks}, nil
}

func NetworkRemove(req *DockerNetworkRemove) error {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return err
	}

	err = cli.NetworkRemove(context.Background(), req.Id)
	if err != nil {
		return err
	}

	return nil
}

func NetworksPrune(req *DockerNetworksPrune) (*DockerNetworksPruneResponse, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}

	report, err := cli.NetworksPrune(context.Background(), filters.NewArgs())
	if err != nil {
		return nil, err
	}

	return &DockerNetworksPruneResponse{NetworksDeleted: report.NetworksDeleted}, nil
}
