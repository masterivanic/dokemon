package handler

import (
	"errors"

	"github.com/labstack/echo/v4"
)

type errorResponse struct {
	Errors map[string]interface{} `json:"errors"`
}

func newError(err error) errorResponse {
	e := errorResponse{}
	e.Errors = make(map[string]interface{})
	switch v := err.(type) {
	case *echo.HTTPError:
		e.Errors["body"] = v.Message
	default:
		e.Errors["body"] = v.Error()
	}
	return e
}

func resourceNotFoundError(resourceName string) errorResponse {
	e := errorResponse{}
	e.Errors = make(map[string]interface{})
	e.Errors["body"] = resourceName + " not found."
	return e
}

// Error Messages
func duplicateNameError() error {
	return duplicateFieldError("Name")
}

func duplicateUserNameError() error {
	return duplicateFieldError("UserName")
}

func duplicateFieldError(fieldName string) error {
	return errors.New(fieldName + " must be unique.")
}

func routeIntExpectedError(paramName string) error {
	return errors.New("Parameter `" + paramName + "` in route should be an integer.")
}

func queryGte1ExpectedError(paramName string) error {
	return errors.New("Parameter `" + paramName + "` in query string should be greater than or equal to 1.")
}
