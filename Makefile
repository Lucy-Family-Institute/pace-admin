.PHONY: install client

install_hasura_cli:
ifeq (,$(shell which hasura))
	curl -L https://github.com/hasura/graphql-engine/raw/master/cli/get.sh | bash
endif

install_docker_compose:
ifeq (,$(shell which docker-compose))
	sudo curl -L "https://github.com/docker/compose/releases/download/1.24.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
	sudo chmod +x /usr/local/bin/docker-compose
endif

install_yarn:
ifeq (,$(shell which yarn))
	npm -g install yarn
endif

install_quasar:
ifeq (,$(shell which quasar))
	npm -g install quasar
endif

cleardb:
	docker-compose down -v
migrate:
	cd hasura && hasura migrate apply && cd ..
newdb:
	cd ingest && ts-node loadAuthors.ts && cd ..
	cd ingest && ts-node ingestMetadataByDoi.ts && cd ..

install: install_docker_compose install_hasura_cli install_yarn install_quasar
	cd client && yarn && cd ..

start_docker:
	docker-compose up -d
stop_docker:
	docker-compose down

client:
	cd client && quasar dev && cd ..
docker:
	docker-compose up

migration_console:
	cd hasura && hasura console && cd ..