package handler

import (
	"log"

	"github.com/dokemon-ng/dokemon/pkg/crypto/ske"
	"github.com/dokemon-ng/dokemon/pkg/server/model"
)

type variableValueResponse struct {
	Value string `json:"value"`
}

func newVariableValueResponse(m *model.VariableValue) *variableValueResponse {
	var (
		decryptedValue string
		err            error
	)

	if m == nil {
		decryptedValue = ""
	} else {
		decryptedValue, err = ske.Decrypt(m.Value)

		if err != nil {
			log.Fatalln(err)
		}
	}

	return &variableValueResponse{
		Value: decryptedValue,
	}
}
