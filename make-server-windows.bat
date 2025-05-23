git pull
docker buildx build --platform linux/amd64,linux/arm64,linux/arm/v7 -t javastraat/dokemon-server:latest -f Dockerfile.server --push .
pause
