package main

import (
	"os"

	"github.com/dokemon-ng/dokemon/pkg/server"
)

func main() {
	s := server.NewServer(
		os.Getenv("DB_CONNECTION_STRING"),
		os.Getenv("DATA_PATH"),
		os.Getenv("LOG_LEVEL"),
		os.Getenv("SSL_ENABLED"),
		os.Getenv("STALENESS_CHECK"),
	)

	port := os.Getenv("DOKEMON_PORT")
	if port == "" {
		port = "9090"
	}
	bindAddr := ":" + port
	s.Run(bindAddr)
}
