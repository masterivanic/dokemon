.PHONY: help

default: help

build-server: ## Build server for production or local
	@if [ "$(env-target)" = "prod" ]; then \
		sudo docker buildx build --platform linux/amd64,linux/arm64 -t javastraat/dokemon-server:latest --push -f Dockerfile.server .; \
	else \
		sudo docker buildx build -t javastraat/dokemon-server:latest -f Dockerfile.server .; \
	fi

build-agent: ## Build agent for production or local
	@if [ "$(env-target)" = "prod" ]; then \
		sudo docker buildx build --platform linux/amd64,linux/arm64 -t javastraat/dokemon-agent:latest  --push -f Dockerfile.agent .; \
	else \
		sudo docker buildx build -t javastraat/dokemon-agent:latest -f Dockerfile.agent .; \
	fi

run-server: ## Run Docker server locally
	@docker stop dokemon-server || true
	@docker rm dokemon-server || true
	@docker run -d \
		--name dokemon-server \
		--restart unless-stopped \
		-p 9090:9090 \
		-v /dokemondata:/data \
		-v /var/run/docker.sock:/var/run/docker.sock \
		javastraat/dokemon-server:latest

run-traefik-compose: ## Run dokemon localy using traefik
	sudo docker compose --env-file .env -f compose/dokemon-traefik-compose-dev.yml build \
	&& sudo docker compose --env-file .env -f compose/dokemon-traefik-compose-dev.yml up -d

run-website: ## Run dokemon website localy
	sudo docker compose --env-file .env -f compose/dokemon-website.yml build \
	&& sudo docker compose --env-file .env -f compose/dokemon-website.yml up -d


run-agent: ## Build and run the Docker agent locally
	@rm -f ./agent

	@echo "🔧 Building agent..."
	@go build -o agent ./cmd/agent

	@echo "🚀 Running agent..."
	@SERVER_URL="http://192.168.1.7:9090" \
	LOG_LEVEL="DEBUG" \
	./agent


runserver: ## Build and run the server locally
	@echo "🧹 Cleaning up previous build..."
	@rm -f ./server

	@echo "🌐 Building web frontend..."
	@cd web && npm run build

	@echo "🔧 Building Go server..."
	@go build -o server ./cmd/server

	@echo "🚀 Starting server..."
	@DB_CONNECTION_STRING="/tmp/db" \
	DATA_PATH="/tmp" \
	LOG_LEVEL="DEBUG" \
	SSL_ENABLED="0" \
	./server


help:
	@echo "usage: make [command]"
	@echo ""
	@echo "dokemon-ng available commands 🐳:"
	@sed \
    		-e '/^[a-zA-Z0-9_\-]*:.*##/!d' \
    		-e 's/:.*##\s*/:/' \
    		-e 's/^\(.\+\):\(.*\)/$(shell tput setaf 6)\1$(shell tput sgr0):\2/' \
    		$(MAKEFILE_LIST) | column -c2 -t -s :
