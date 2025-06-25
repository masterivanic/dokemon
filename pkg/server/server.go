package server

import (
	"errors"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path"
	"runtime"
	"strings"
	"time"

	"github.com/dokemon-ng/dokemon/pkg/common"
	"github.com/dokemon-ng/dokemon/pkg/crypto/ske"
	"github.com/dokemon-ng/dokemon/pkg/crypto/ssl"
	"github.com/dokemon-ng/dokemon/pkg/dockerapi"
	"github.com/dokemon-ng/dokemon/pkg/server/handler"
	"github.com/dokemon-ng/dokemon/pkg/server/model"
	"github.com/dokemon-ng/dokemon/pkg/server/requestutil"
	"github.com/dokemon-ng/dokemon/pkg/server/router"
	"github.com/dokemon-ng/dokemon/pkg/server/store"

	"github.com/glebarez/sqlite"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"gorm.io/gorm"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

type Server struct {
	Echo       *echo.Echo
	handler    *handler.Handler
	dataPath   string
	sslEnabled bool
}

func getArchitecture() string {
	switch runtime.GOARCH {
	case "amd64":
		return "amd64"
	case "arm64":
		return "arm64"
	case "arm":
		return "armv7"
	default:
		return runtime.GOARCH
	}
}

func logAllNetworkInterfaces() {
	interfaces, err := net.Interfaces()
	if err != nil {
		log.Error().Err(err).Msg("Failed to get network interfaces")
		return
	}

	for _, iface := range interfaces {
		logData := log.Info().
			Str("interface", iface.Name).
			Str("flags", iface.Flags.String()).
			Str("hardware", iface.HardwareAddr.String())

		addrs, err := iface.Addrs()
		if err != nil {
			logData.Msg("Interface (failed to get addresses)")
			continue
		}

		var ips []string
		for _, addr := range addrs {
			ipnet, ok := addr.(*net.IPNet)
			if ok {
				ips = append(ips, ipnet.IP.String())
			}
		}
		logData.Strs("ips", ips).Msg("Network interface details")
	}
}

func getMainIP() string {
	log.Debug().Msg("Starting IP detection")

	// Log all interfaces first
	logAllNetworkInterfaces()

	// Get all relevant IPs
	localIP := getLocalNetworkIP()
	log.Debug().Str("localIP", localIP).Msg("Got local IP from getLocalNetworkIP()")

	// Get all network interfaces
	interfaces, err := net.Interfaces()
	if err != nil {
		log.Error().Err(err).Msg("Failed to get network interfaces")
		return ""
	}

	// Collect all ZeroTier and Tailscale IPs
	var ztIPs, tsIPs []string

	for _, iface := range interfaces {
		ifaceName := iface.Name

		if strings.HasPrefix(ifaceName, "zt") {
			if ip := getInterfaceIP(ifaceName); ip != "" {
				log.Debug().Str("interface", ifaceName).Str("ip", ip).Msg("Found ZeroTier IP")
				ztIPs = append(ztIPs, "zt:"+ip)
			}
		}

		if strings.HasPrefix(ifaceName, "tailscale") {
			if ip := getInterfaceIP(ifaceName); ip != "" {
				log.Debug().Str("interface", ifaceName).Str("ip", ip).Msg("Found Tailscale IP")
				tsIPs = append(tsIPs, "ts:"+ip)
			}
		}
	}

	// Build the version string components
	var components []string
	if localIP != "" {
		components = append(components, localIP)
	}
	components = append(components, ztIPs...)
	components = append(components, tsIPs...)

	result := strings.Join(components, "+")
	log.Debug().Strs("components", components).Str("result", result).Msg("Final IP components")

	return result
}

func getLocalNetworkIP() string {
	// Try Docker bridge method first
	if ip := getHostIPViaDockerBridge(); ip != "" {
		return ip
	}

	// Try default route method
	if ip := getIPFromDefaultRoute(); ip != "" {
		return ip
	}

	// Try Docker bridge IP method
	if ip := getIPFromDockerBridge(); ip != "" {
		return ip
	}

	return ""
}

func getInterfaceIP(ifaceName string) string {
	iface, err := net.InterfaceByName(ifaceName)
	if err != nil {
		return ""
	}

	addrs, err := iface.Addrs()
	if err != nil {
		return ""
	}

	for _, addr := range addrs {
		ipNet, ok := addr.(*net.IPNet)
		if !ok || ipNet.IP.To4() == nil || ipNet.IP.IsLoopback() {
			continue
		}
		return ipNet.IP.String()
	}
	return ""
}

func getHostIPViaDockerBridge() string {
	cmd := exec.Command("sh", "-c", "ip route | awk '/default/ {print $3}'")
	output, err := cmd.Output()
	if err == nil {
		gatewayIP := strings.TrimSpace(string(output))
		if net.ParseIP(gatewayIP) != nil && !isDockerIP(gatewayIP) {
			log.Debug().Str("source", "docker bridge gateway").Str("ip", gatewayIP).Msg("Found host IP")
			return gatewayIP
		}
	}
	return ""
}

func getIPFromDefaultRoute() string {
	ifaces, err := net.Interfaces()
	if err != nil {
		return ""
	}

	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}

		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}

		for _, addr := range addrs {
			ipNet, ok := addr.(*net.IPNet)
			if !ok || ipNet.IP.To4() == nil {
				continue
			}
			ip := ipNet.IP.String()
			if !isDockerIP(ip) {
				log.Debug().Str("source", "host interface "+iface.Name).Str("ip", ip).Msg("Found host IP")
				return ip
			}
		}
	}
	return ""
}

func getIPFromDockerBridge() string {
	cmd := exec.Command("sh", "-c", "ip -4 addr show docker0 | grep -oP '(?<=inet\\s)\\d+(\\.\\d+){3}'")
	output, err := cmd.Output()
	if err == nil {
		ip := strings.TrimSpace(string(output))
		if net.ParseIP(ip) != nil {
			parts := strings.Split(ip, ".")
			if len(parts) == 4 {
				parts[3] = fmt.Sprintf("%d", atoi(parts[3])+1)
				hostIP := strings.Join(parts, ".")
				log.Debug().Str("source", "docker0 bridge").Str("ip", hostIP).Msg("Derived host IP")
				return hostIP
			}
		}
	}
	return ""
}

func atoi(s string) int {
	i := 0
	for _, c := range s {
		i = i*10 + int(c-'0')
	}
	return i
}

func isDockerIP(ip string) bool {
	excludedPrefixes := []string{
		"172.17.", "172.18.", "172.19.", "172.20.",
		"192.168.99.", "100.", "169.254.", "127.",
	}
	for _, prefix := range excludedPrefixes {
		if strings.HasPrefix(ip, prefix) {
			return true
		}
	}
	return false
}

func getFullVersion() string {
	ip := getMainIP()
	if ip != "" {
		return fmt.Sprintf("%s-%s@%s", common.Version, getArchitecture(), ip)
	}
	return fmt.Sprintf("%s-%s", common.Version, getArchitecture())
}

func NewServer(dbConnectionString string, dataPath string, logLevel string, sslEnabled string, stalenessCheck string) *Server {
	s := Server{}

	setLogLevel(logLevel)
	//	log.Info().Msg("Starting Dokemon v" + common.Version)

	log.Info().
		Str("version", common.Version).
		Str("os", runtime.GOOS).
		Str("arch", runtime.GOARCH).
		Msg("Starting Dokémon")

	//log.Info().Msgf("Starting Dokémon v%s-%s", common.Version, runtime.GOARCH)
	log.Info().Msgf("Starting Dokémon Server %s", getFullVersion())

	if dataPath == "" {
		dataPath = "/data"
	}
	s.dataPath = dataPath

	if dbConnectionString == "" {
		dbConnectionString = dataPath + "/db"
	}

	s.sslEnabled = sslEnabled == "1"

	composeProjectsPath := path.Join(dataPath, "/compose")
	initCompose(composeProjectsPath)
	initEncryption(dataPath)
	db, err := initDatabase(dbConnectionString)
	if err != nil {
		log.Fatal().Err(err).Msg("Error while initializing database")
	}

	// Setup stores
	sqlNodeComposeProjectStore := store.NewSqlNodeComposeProjectStore(db, composeProjectsPath)
	h := handler.NewHandler(
		composeProjectsPath,
		store.NewSqlComposeLibraryStore(db),
		store.NewSqlCredentialStore(db),
		store.NewSqlEnvironmentStore(db),
		store.NewSqlUserStore(db),
		store.NewSqlNodeStore(db),
		sqlNodeComposeProjectStore,
		store.NewSqlNodeComposeProjectVariableStore(db),
		store.NewSqlSettingStore(db),
		store.NewSqlVariableStore(db),
		store.NewSqlVariableValueStore(db),
		store.NewLocalFileSystemComposeLibraryStore(db, composeProjectsPath),
	)

	err = sqlNodeComposeProjectStore.UpdateOldVersionRecords()
	if err != nil {
		log.Error().Err(err).Msg("Error while updating old version data")
	}

	if stalenessCheck != "OFF" {
		go dockerapi.ContainerScheduleRefreshStaleStatus()
	}

	// Web Server
	s.handler = h
	s.Echo = router.New()
	s.Echo.HideBanner = true
	s.Echo.Use(s.authMiddleware)
	s.Echo.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowHeaders: []string{"*"},
		AllowMethods: []string{"*"},
	}))
	h.Register(s.Echo)

	return &s
}

func initCompose(composeProjectsPath string) {
	os.MkdirAll(composeProjectsPath, os.ModePerm)
}

func initEncryption(dataPath string) {
	keyFile := dataPath + "/key"
	if _, err := os.Stat(keyFile); errors.Is(err, os.ErrNotExist) {
		log.Info().Msg("key file does not exist. Generating new key.")
		f, err := os.Create(keyFile)
		if err != nil {
			log.Fatal().Err(err).Msg("Error while creating key file")
		}
		key, err := ske.GenerateRandomKey()
		if err != nil {
			log.Fatal().Err(err).Msg("Error while generating random key")
		}
		f.WriteString(key)
	}

	keyBytes, err := os.ReadFile(keyFile)
	if err != nil {
		log.Fatal().Err(err).Msg("Error while reading key file")
	}

	ske.Init(string(keyBytes))
}

func initDatabase(dbConnectionString string) (*gorm.DB, error) {
	db, err := gorm.Open(sqlite.Open(dbConnectionString), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	err = db.AutoMigrate(
		&model.ComposeLibraryItem{},
		&model.Credential{},
		&model.Environment{},
		&model.Node{},
		&model.NodeComposeProject{},
		&model.NodeComposeProjectVariable{},
		&model.Setting{},
		&model.User{},
		&model.Variable{},
		&model.VariableValue{},
	)
	if err != nil {
		return nil, err
	}

	err = db.FirstOrCreate(&model.Setting{Id: "SERVER_URL", Value: ""}).Error
	if err != nil {
		return nil, err
	}

	err = db.FirstOrCreate(&model.Node{Id: 1, Name: "[Dokemon Server]", TokenHash: nil, LastPing: nil}).Error
	if err != nil {
		return nil, err
	}

	return db, nil
}

func (s *Server) Run(addr string) {
	// Always start HTTP server on the specified port
	go func() {
		log.Info().Str("address", addr).Msg("Starting HTTP server")
		if err := s.Echo.Start(addr); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("Failed to start HTTP server")
		}
	}()

	// Start HTTPS server if enabled
	if s.sslEnabled {
		go func() {
			certsDirPath := path.Join(s.dataPath, "certs")
			certPath := path.Join(certsDirPath, "server.crt")
			keyPath := path.Join(certsDirPath, "server.key")
			s.generateSelfSignedCerts(certsDirPath, certPath, keyPath)

			httpsAddr := ":9443"
			log.Info().Str("address", httpsAddr).Msg("Starting HTTPS server")
			if err := s.Echo.StartTLS(httpsAddr, certPath, keyPath); err != nil && err != http.ErrServerClosed {
				log.Fatal().Err(err).Msg("Failed to start HTTPS server")
			}
		}()
	}

	// Block forever (or until interrupt)
	select {}
}

func (s *Server) authMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		if !strings.HasPrefix(c.Request().URL.Path, "/api/") || strings.HasPrefix(c.Request().URL.Path, "/api/v1/users") {
			return next(c)
		}

		cc, err := requestutil.GetAuthCookie(c)
		if err != nil {
			fmt.Println(err.Error())
			log.Warn().Err(err).Msg("Invalid or missing auth cookie")
			return c.NoContent(http.StatusUnauthorized)
		}

		if time.Now().After(cc.Expiry) {
			log.Info().Str("userName", cc.UserName).Msg("Login session expired for user")
			return c.NoContent(http.StatusUnauthorized)
		}

		c.Set("userName", cc.UserName)

		return next(c)
	}
}

func (s *Server) generateSelfSignedCerts(certDirPath string, certPath string, keyPath string) {
	if _, err := os.Stat(certDirPath); errors.Is(err, os.ErrNotExist) {
		err := os.MkdirAll(certDirPath, os.ModePerm)
		if err != nil {
			panic(err)
		}
	}
	if _, err := os.Stat(certPath); errors.Is(err, os.ErrNotExist) {
		log.Debug().Msg("SSL certificate file does not exist. Generating self-signed certificate...")

		cert, key, err := ssl.GenerateSelfSignedCert()
		if err != nil {
			panic(err)
		}

		certFile, err := os.Create(certPath)
		if err != nil {
			panic(err)
		}
		_, err = certFile.WriteString(cert)
		if err != nil {
			panic(err)
		}

		keyFile, err := os.Create(keyPath)
		if err != nil {
			panic(err)
		}
		_, err = keyFile.WriteString(key)
		if err != nil {
			panic(err)
		}
	}
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
