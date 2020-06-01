include .env

# TODO differentiate WSL Linux and Linux see:
# https://stackoverflow.com/questions/38086185/how-to-check-if-a-program-is-run-in-bash-on-ubuntu-on-windows-and-not-just-plain
UNAME := $(shell uname -s)
SYSTEM = Linux

ifeq ($(UNAME),Linux)
	ifeq ($(WSL),1)
		SYSTEM = 'WSL'
	endif
	else
	ifeq ($(UNAME),Darwin)
		SYSTEM = 'Mac'
	else
		SYSTEM = 'Windows'
	endif
endif

DOCKER_HOST_IP = host.docker.internal
ifeq ($(SYSTEM),Linux) 	
	DOCKER_HOST_IP=$(shell ip -4 addr show docker0 | grep -Po 'inet \K[\d.]+')
endif

.PHONY: install client

info:
	@echo $(UNAME), $(WSL), $(SYSTEM), $(DOCKER_HOST_IP)

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

install_js:
	cd client && yarn && cd ..
	cd server && yarn && cd ..
	cd ingest && yarn && cd ..

calculate_confidence:
	cd ingest && ts-node calculateConfidence.ts && cd ..

cleardb:
	DOCKER_HOST_IP=$(DOCKER_HOST_IP) docker-compose down -v
migrate:
	cd hasura && hasura migrate apply && cd ..
newdb:
	cd ingest && ts-node loadAuthors.ts && cd ..
	cd ingest && ts-node loadAuthorNameVariances.ts && cd ..
	cd ingest && ts-node ingestMetadataByDoi.ts && cd ..
	cd ingest && ts-node calculateConfidence.ts && cd ..

load_name_variances:
	cd ingest && ts-node loadAuthorNameVariances.ts && cd ..

update_scopus_data:
	cd ingest && ts-node fetchScopusFullTextData.ts && cd ..

scopus_author_data:
	cd ingest && ts-node fetchScopusAuthorObjects.ts && cd ..

install: install_docker_compose install_hasura_cli install_yarn install_quasar install_js
	echo 'Installing'

start_docker:
	DOCKER_HOST_IP=$(DOCKER_HOST_IP) docker-compose up -d
stop_docker:
	docker-compose down

client:
	cd client && quasar dev && cd ..
server:
	cd server && ts-node src/index.ts && cd ..
docker:
	DOCKER_HOST_IP=$(DOCKER_HOST_IP) docker-compose up 

clear_pdfs:
	rm data/pdfs/*
	rm data/thumbnails/*

migration_console:
	cd hasura && hasura console && cd ..
