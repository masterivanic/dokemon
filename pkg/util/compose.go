package util

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"

	"github.com/dokemon-ng/dokemon/pkg/server/store"
	"github.com/gorilla/websocket"
	"github.com/rs/zerolog/log"
)

func ToEnvFormat(variables map[string]store.VariableValue) []string {
	ret := make([]string, len(variables))

	i := 0
	for k, v := range variables {
		ret[i] = fmt.Sprintf("%s=%s", k, *v.Value)
		i++
	}

	return ret
}

func LogVars(cmd *exec.Cmd, variables map[string]store.VariableValue, ws *websocket.Conn, print bool) {
	if print {
		ws.WriteMessage(websocket.TextMessage, []byte("*** SETTING BELOW VARIABLES: ***\n\n"))
	}

	keys := make([]string, 0)
	for k := range variables {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	for _, k := range keys {
		val := "[SECRET]"
		if !variables[k].IsSecret {
			val = *variables[k].Value
		}
		if print {
			ws.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("%s=%s\n", k, val)))
		}
	}
}

func CreateTempComposeFile(projectName string, definition string, variables map[string]store.VariableValue) (string, string, string, error) {
	dir, err := os.MkdirTemp("", projectName)
	if err != nil {
		log.Error().Err(err).Msg("Error while creating temp directory for compose")
		return "", "", "", err
	}

	composeFilename := filepath.Join(dir, "compose.yaml")
	composeFile, err := os.Create(composeFilename)
	if err != nil {
		log.Error().Err(err).Msg("Error while creating temp compose file")
		return "", "", "", err
	}

	_, err = composeFile.WriteString(definition)
	if err != nil {
		log.Error().Err(err).Msg("Error while writing to temp compose file")
		return "", "", "", err
	}

	envFilename := filepath.Join(dir, ".env")
	envFile, err := os.Create(envFilename)
	if err != nil {
		log.Error().Err(err).Msg("Error while creating temp compose file")
		return "", "", "", err
	}

	envVars := ToEnvFormat(variables)
	for _, v := range envVars {
		_, err = envFile.WriteString(v + "\r\n")
		if err != nil {
			log.Error().Err(err).Msg("Error while writing to temp .env file")
			return "", "", "", err
		}
	}

	return dir, composeFilename, envFilename, nil
}
