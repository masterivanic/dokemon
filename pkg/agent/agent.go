package agent

import (
	"fmt"
	"os"
	"os/signal"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/dokemon-ng/dokemon/pkg/common"
	"github.com/dokemon-ng/dokemon/pkg/dockerapi"
	"github.com/dokemon-ng/dokemon/pkg/messages"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

var (
	logLevel       string
	wsUrl          string
	token          string
	stalenessCheck string = "ON"
)

func getArchitecture() string {
	switch runtime.GOARCH {
	case "amd64":
		return "amd64"
	case "arm64":
		return "arm64"
	case "arm":
		// Check if it's armv7 or armv6
		return "armv7"
	default:
		return runtime.GOARCH
	}
}

func getFullVersion() string {
	return fmt.Sprintf("%s-%s", common.Version, getArchitecture())
}

func Main() {
	parseArgs()
	setLogLevel(logLevel)
	if stalenessCheck != "OFF" {
		go dockerapi.ContainerScheduleRefreshStaleStatus()
	}
	listen()
}

func parseArgs() {
	logLevel = os.Getenv("LOG_LEVEL")
	serverUrl := os.Getenv("SERVER_URL")
	token = os.Getenv("TOKEN")
	stalenessCheck = os.Getenv("STALENESS_CHECK")

	serverScheme := "ws"
	if strings.HasPrefix(serverUrl, "https") {
		serverScheme = "wss"
	}

	urlParts := strings.Split(serverUrl, "//")
	if len(urlParts) != 2 {
		panic("Invalid SERVER_URL " + serverUrl)
	}

	host := urlParts[1]
	wsUrl = fmt.Sprintf("%s://%s/ws", serverScheme, host)

	// log.Info().Str("url", wsUrl).Msg("Starting Dokemon Agent v" + common.Version)
	//log.Info().Str("url", wsUrl).Msgf("Starting Dokemon Agent %s-%s", getArchitecture(), common.Version)
	log.Info().Str("url", wsUrl).Msgf("Starting Dokemon Agent %s", getFullVersion())
	log.Info().Str("url", wsUrl).Msg("Server set to URL")
}

func setLogLevel(logLevel string) {
	log.Info().Str("level", logLevel).Msg("Setting log level")
	switch logLevel {
	case "DEBUG":
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	case "ERROR":
		zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	case "FATAL":
		zerolog.SetGlobalLevel(zerolog.FatalLevel)
	case "INFO":
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	case "WARN":
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	case "PANIC":
		zerolog.SetGlobalLevel(zerolog.PanicLevel)
	case "TRACE":
		zerolog.SetGlobalLevel(zerolog.TraceLevel)
	default:
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}
}

func open() *websocket.Conn {
	log.Debug().Str("url", wsUrl).Msg("Opening connection to server")

	c, _, err := websocket.DefaultDialer.Dial(wsUrl, nil)
	if err != nil {
		log.Fatal().Err(err).Str("url", wsUrl).Msg("Error opening connection")
	}

	return c
}

func openWithPing() (*websocket.Conn, *sync.Mutex) {
	c := open()
	mu := setupPinging(c)

	return c, mu
}

func setupPinging(ws *websocket.Conn) *sync.Mutex {
	pongWait := 10 * time.Second
	pingPeriod := (pongWait * 9) / 10

	var mu sync.Mutex

	ws.SetPongHandler(func(string) error {
		log.Trace().Msg("Pong received")
		ws.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	pingTicker := time.NewTicker(pingPeriod)

	go func() {
		for range pingTicker.C {
			log.Trace().Msg("Ping sent")
			mu.Lock()
			err := ws.WriteMessage(websocket.PingMessage, nil)
			mu.Unlock()
			if err != nil {
				if err.Error() != "websocket: close sent" {
					log.Debug().Err(err).Msg("Error when sending Ping control message")
				}
				return
			}

			mu.Lock()
			err = messages.Send[messages.Ping](ws, messages.Ping{})
			mu.Unlock()
			if err != nil {
				if err.Error() != "websocket: close sent" {
					log.Debug().Err(err).Msg("Error when sending Ping application message")
				}
				return
			}
		}
	}()

	return &mu
}

func listen() {
	interrupt := make(chan os.Signal, 1)
	signal.Notify(interrupt, os.Interrupt)

	log.Info().Msg("Connecting to server")
	c, mu := openWithPing()
	defer c.Close()

	mu.Lock()
	initialConnectMessage := messages.ConnectMessage{
		ConnectionToken: token,
		AgentVersion:    getFullVersion(), //common.Version,
		AgentArch:       getArchitecture(),
	}
	messages.Send[messages.ConnectMessage](c, initialConnectMessage)
	mu.Unlock()

	connectResponse, err := messages.Receive[messages.ConnectResponseMessage](c)
	if err != nil {
		log.Fatal().Err(err)
	}
	if connectResponse == nil {
		log.Fatal().Msg("Connection with server failed")
	} else if !connectResponse.Success {
		log.Fatal().Msg(connectResponse.Message)
	}

	log.Info().Msg("Listening for tasks")
	done := make(chan struct{})
	go func() {
		defer close(done)
		listenForTasks(c)
	}()

	for {
		select {
		case <-done:
			return
		case <-interrupt:
			c.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
			return
		}
	}
}

func listenForTasks(c *websocket.Conn) {
	taskChan := make(chan string, 100)
	// https://www.opsdash.com/blog/job-queues-in-go.html
	go worker(taskChan)

	for {
		_, message, err := c.ReadMessage()
		if err != nil {
			log.Error().Err(err).Msg("Connection lost to server")
			return
		}
		log.Debug().Str("message", string(message)).Msg("Task received")
		taskChan <- string(message)
	}
}

func worker(taskChan <-chan string) {
	for task := range taskChan {
		taskQueuedMessage, err := messages.Parse[messages.TaskQueuedMessage](task)
		if err != nil {
			continue
		}

		go startTaskSession(*taskQueuedMessage)
	}
}
