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
		getEnv("SSL_ENABLED", "1"), // Default to HTTPS enabled
		os.Getenv("STALENESS_CHECK"),
	)

	port := getEnv("DOKEMON_PORT", "9090")
	bindAddr := ":" + port
	s.Run(bindAddr)
}

// Helper function to get env vars with defaults
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
