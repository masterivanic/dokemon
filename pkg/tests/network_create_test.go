package tests

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"github.com/docker/docker/api/types/network"
	dokemonDocker "github.com/dokemon-ng/dokemon/pkg/dockerapi"
)

func TestNetworkCreate(t *testing.T) {
	tests := []struct {
		name          string
		req           *dokemonDocker.DockerNetworkCreate
		expectedError string
		mockFunc      func(ctx context.Context, name string, options network.CreateOptions) (dokemonDocker.DockerNetworkCreateResponse, error)
	}{
		{
			name: "basic-bridge-network",
			req: &dokemonDocker.DockerNetworkCreate{
				Name:   "test-network",
				Driver: "bridge",
			},
			mockFunc: func(ctx context.Context, name string, options network.CreateOptions) (dokemonDocker.DockerNetworkCreateResponse, error) {
				if name != "test-network" {
					return dokemonDocker.DockerNetworkCreateResponse{}, fmt.Errorf("expected name 'test-network', got '%s'", name)
				}
				if options.Driver != "bridge" {
					return dokemonDocker.DockerNetworkCreateResponse{}, fmt.Errorf("expected driver 'bridge', got '%s'", options.Driver)
				}
				return dokemonDocker.DockerNetworkCreateResponse{ID: "network-id-123"}, nil
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockClient := &MockDockerClient{
				NetworkCreateFunc: tt.mockFunc,
			}
			testClient := &Client{
				APIClient: mockClient,
			}
			_, err := testClient.NetworkCreate(context.Background(), tt.req)

			if tt.expectedError != "" {
				if err == nil {
					t.Fatalf("expected error '%s', got nil", tt.expectedError)
				}
				if !strings.Contains(err.Error(), tt.expectedError) {
					t.Fatalf("expected error to contain '%s', got '%s'", tt.expectedError, err.Error())
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}
