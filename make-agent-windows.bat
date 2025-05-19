git pull
docker buildx build --platform linux/amd64,linux/arm64 -t javastraat/dokemon-agent:latest -f Dockerfile.agent --push .
pause
