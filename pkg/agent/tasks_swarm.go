package agent

import (
	"github.com/dokemon-ng/dokemon/pkg/dockerapi"
	"github.com/dokemon-ng/dokemon/pkg/messages"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog/log"
)

func handleClusterSwarmNodesList(c *websocket.Conn, messageString string) {
	m, err := messages.Parse[dockerapi.ClusterSwarmNodeList](messageString)
	if err != nil {
		err := completedWithFailure(c, "Error parsing request message")
		if err != nil {
			log.Debug().Err(err).Msg("Error sending message to client")
		}
		return
	}

	res, err := dockerapi.GetSwarmClusterNodesList(m)
	if err != nil {
		err := completedWithFailure(c, err.Error())
		if err != nil {
			log.Debug().Err(err).Msg("Error sending message to client")
		}
		return
	}
	resString := string(messages.Serialize(*res))
	err = completedWithSuccess(c, &resString)
	if err != nil {
		log.Debug().Err(err).Msg("Error sending message to client")
	}
}

func handleGetSwarmNodeById(c *websocket.Conn, messageString string) {
	m, err := messages.Parse[dockerapi.SwarmNodeInfoId](messageString)
	if err != nil {
		err := completedWithFailure(c, "Error parsing request message")
		if err != nil {
			log.Debug().Err(err).Msg("Error sending message to client")
		}
		return
	}

	res, err := dockerapi.GetSwarmNodeByID(m)
	if err != nil {
		err := completedWithFailure(c, err.Error())
		if err != nil {
			log.Debug().Err(err).Msg("Error sending message to client")
		}
		return
	}
	resString := string(messages.Serialize(*res))
	err = completedWithSuccess(c, &resString)
	if err != nil {
		log.Debug().Err(err).Msg("Error sending message to client")
	}
}
