package tests

import (
	"context"
	"testing"

	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/client"
	types "github.com/dokemon-ng/dokemon/pkg/dockerapi"
)

type Client struct {
	client.APIClient
}

type MockDockerClient struct {
	client.APIClient
	NetworkCreateFunc func(ctx context.Context, name string, options network.CreateOptions) (types.DockerNetworkCreateResponse, error)
}

func (c *Client) NetworkCreate(ctx context.Context, req *types.DockerNetworkCreate) (*types.DockerNetworkCreateResponse, error) {
	var ipam *network.IPAM
	opts := network.CreateOptions{
		Driver:     req.Driver,
		Options:    req.Options,
		Labels:     req.Labels,
		IPAM:       ipam,
		Internal:   req.Internal,
		Attachable: req.Attachable,
		Ingress:    req.Ingress,
		EnableIPv6: &req.EnableIPv6,
	}

	resp, err := c.APIClient.NetworkCreate(ctx, req.Name, opts)
	if err != nil {
		return nil, err
	}

	return &types.DockerNetworkCreateResponse{
		ID:      resp.ID,
		Warning: resp.Warning,
	}, nil
}

func NewMockClient(t *testing.T, mockFunc func(ctx context.Context, name string, options network.CreateOptions) (types.DockerNetworkCreateResponse, error)) *MockDockerClient {
	return &MockDockerClient{
		NetworkCreateFunc: mockFunc,
	}
}
