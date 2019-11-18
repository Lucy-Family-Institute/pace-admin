.PHONY: install docker client

install_hasura_cli:
	curl -L https://github.com/hasura/graphql-engine/raw/master/cli/get.sh | bash

install_docker_compose:
	sudo curl -L "https://github.com/docker/compose/releases/download/1.24.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
	sudo chmod +x /usr/local/bin/docker-compose

install: install_docker_compose install_hasura_cli
	npm -g install yarn
	npm -g install quasar
	cd client && yarn && cd ..

docker:
	docker-compose up
client:
	cd client && quasar dev && cd ..