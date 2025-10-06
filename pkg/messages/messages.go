package messages

type Ping struct{}

type ConnectMessage struct {
	ConnectionToken string `json:"connectionToken"`
	AgentVersion    string `json:"agentVersion"`
	AgentArch       string `json:"agentArch"` // Add this line
}

type ConnectResponseMessage struct {
	Message string `json:"message"`
	Success bool   `json:"success"`
}

type TaskQueuedMessage struct {
	TaskId         string `json:"taskId"`
	TaskDefinition string `json:"taskDefinition"`
}

type TaskSessionMessage struct {
	ConnectionToken string `json:"connectionToken"`
	TaskId          string `json:"taskId"`
	Stream          bool   `json:"stream"`
}

type TaskSessionResponseMessage struct {
	Message string `json:"message"`
	Success bool   `json:"success"`
}

type TaskLogMessage struct {
	Level  string `json:"level"`
	Text   string `json:"text"`
	Offset uint   `json:"offset"`
}

type TaskStatusMessage struct {
	Result *string `json:"result"`
	Status string  `json:"status"`
}

type Message interface {
	Ping |
		ConnectMessage | ConnectResponseMessage |
		TaskQueuedMessage | TaskSessionMessage | TaskSessionResponseMessage | TaskStatusMessage | TaskLogMessage
}
