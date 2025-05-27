package dockerapi

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/dokemon-ng/dokemon/pkg/registry"
	"github.com/rs/zerolog/log"
)

var containerStaleStatus map[string]string

const (
	StaleStatusProcessing = "processing"
	StaleStatusYes        = "yes"
	StaleStatusNo         = "no"
	StaleStatusError      = "error"
)

func isContainerImageStale(imageAndTag string, imageId string, cli *client.Client) (bool, error) {
	latestDigest, err := registry.GetImageDigest(imageAndTag)
	if err != nil {
		return false, err
	}

	imageInspect, err := cli.ImageInspect(context.Background(), imageId)
	if err != nil {
		return false, err
	}
	if len(imageInspect.RepoDigests) == 0 {
		return false, fmt.Errorf("no RepoDigests found for image ID %s (image: %s)", imageId, imageAndTag)
	}

	currentDigest := imageInspect.RepoDigests[0]
	if strings.Contains(currentDigest, "@") {
		currentDigestParts := strings.Split(currentDigest, "@")
		if len(currentDigestParts) != 2 {
			return false, fmt.Errorf("invalid RepoDigest format: %s", currentDigest)
		}
		currentDigest = currentDigestParts[1]
	}

	isStale := currentDigest != latestDigest
	return isStale, nil
}

func ContainerScheduleRefreshStaleStatus() {
	for {
		log.Info().Msg("Refreshing container stale status")
		ContainerRefreshStaleStatus()
		time.Sleep(24 * time.Hour)
	}
}
func ContainerRefreshStaleStatus() error {
	if containerStaleStatus == nil {
		containerStaleStatus = make(map[string]string)
	}
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return err
	}

	dcontainers, err := cli.ContainerList(context.Background(), container.ListOptions{All: true})
	if err != nil {
		return err
	}

	for _, c := range dcontainers {
		_, ok := containerStaleStatus[c.ID]
		if !ok {
			containerStaleStatus[c.ID] = StaleStatusProcessing
		}
	}

	for _, c := range dcontainers {
		image := c.Image
		if image == "" {
			log.Warn().Str("containerId", c.ID).Msg("Skipping container with empty image name")
			continue
		}

		stale := StaleStatusProcessing
		isStale, err := isContainerImageStale(image, c.ImageID, cli)
		if err != nil {
			stale = StaleStatusError
			log.Error().Err(err).Str("containerId", c.ID).Str("image", image).Msg("Error while checking if container is stale")
		} else {
			if isStale {
				stale = StaleStatusYes
			} else {
				stale = StaleStatusNo
			}
		}
		containerStaleStatus[c.ID] = stale
		containerStaleStatus[c.ID[:12]] = stale // Safe since Docker IDs are always >=12 chars
	}

	return nil
}
