
#!/bin/bash

# Get container name from argument or use default
CONTAINER_NAME="${1:-dokemon-agent}"

# Inspect the container
INSPECT_OUTPUT=$(docker inspect "$CONTAINER_NAME" 2>/dev/null)

if [ $? -ne 0 ]; then
  echo "Error: Container '$CONTAINER_NAME' not found."
  exit 1
fi

# Extract configuration values
IMAGE=$(echo "$INSPECT_OUTPUT" | jq -r '.[0].Config.Image')
RESTART_POLICY=$(echo "$INSPECT_OUTPUT" | jq -r '.[0].HostConfig.RestartPolicy.Name')
VOLUME_MAP=$(echo "$INSPECT_OUTPUT" | jq -r '.[0].HostConfig.Binds[0]')
ENV_VARS=$(echo "$INSPECT_OUTPUT" | jq -r '.[0].Config.Env[] | select(startswith("SERVER_URL=") or startswith("TOKEN="))')

# Generate the run command
RUN_CMD="docker run -d --net=host --name $CONTAINER_NAME --restart $RESTART_POLICY"

# Add environment variables
while read -r env_var; do
  RUN_CMD+=" -e \"$env_var\""
done <<< "$ENV_VARS"

# Add volume mapping
RUN_CMD+=" -v $VOLUME_MAP"

# Add image
RUN_CMD+=" -d $IMAGE"

# Print the command with instructions
echo "Generated run command for $CONTAINER_NAME:"
echo
echo "$RUN_CMD"
echo
echo "You can:"
echo "1. Run it as-is"
echo "2. Copy and modify environment variables as needed"
echo "3. Save to a script for later use"
echo
read -p "Execute this command now? [y/N] " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
  docker stop dokemon-agent
  docker rm container -f dokemon-agent
  docker image rm javastraat/dokemon-agent
  eval "$RUN_CMD"
  echo "Container started."
else
  echo "Command ready for modification or later use."
fi
