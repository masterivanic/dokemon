sudo docker buildx build --platform linux/amd64,linux/arm64 -t javastraat/dokemon-server:latest -f Dockerfile.server --push .
