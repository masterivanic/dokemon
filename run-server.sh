sudo docker stop dokemon-server
sudo docker rm dokemon-server
sudo docker run -p 9090:9090 -v /dokemondata:/data -v /var/run/docker.sock:/var/run/docker.sock --restart unless-stopped --name dokemon-server -d javastraat/dokemon-server:latest

