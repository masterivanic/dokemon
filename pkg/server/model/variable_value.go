package model

type VariableValue struct {
	Environment   Environment
	Value         string
	Variable      Variable
	Id            uint
	VariableId    uint
	EnvironmentId uint
}
