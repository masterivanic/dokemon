package main

import (
	"os"

	"github.com/dokemon-ng/dokemon/pkg/server"
)

func main() {
	s := server.NewServer(
		getEnv("DB_CONNECTION_STRING", "/data/db"),
		getEnv("DATA_PATH", "/data"),
		getEnv("LOG_LEVEL", "INFO"),
		getEnv("SSL_ENABLED", "1"),  // Default to HTTPS enabled
		getEnv("STALENESS_CHECK", "ON"),
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