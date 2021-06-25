##############################################################################
# Includes
##############################################################################
include .env

##############################################################################
# Prologue
##############################################################################
MAKEFLAGS += --warn-undefined-variables

ifndef ENV
ENV := dev
ifndef HIDE_INFO
$(info ENV has been set to default 'dev'; run ENV=prod make for production commands)
$(info )
endif
endif

ifndef CONFIRM
CONFIRM := 0
endif

WSL := $(if $(shell command -v bash.exe 2> /dev/null),1,0)
UNAME := $(shell uname -s)
DOCKER_HOST_IP := host.docker.internal
ifeq ($(UNAME),Linux)
	ifneq ($(WSL),1)
		DOCKER_HOST_IP := $(shell ip -4 addr show docker0 | grep -Po 'inet \K[\d.]+')
	endif
endif

RUN_MAKE := HIDE_INFO=1 ENV=$(ENV) CONFIRM=$(CONFIRM) $(MAKE)

##############################################################################
# Docs - Self documenting help feature
##############################################################################
.PHONY: help
help: # Source: https://stackoverflow.com/a/59087509
	@grep -B1 -E "^[a-zA-Z0-9_-]+\:([^\=]|$$)" Makefile \
     | grep -v -- -- \
     | sed 'N;s/\n/###/' \
     | sed -n 's/^#: \(.*\)###\(.*\):.*/\2###\1/p' \
     | column -t  -s '###'

##############################################################################
# Install
##############################################################################

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
	npm install -g @quasar/cli
endif

install_typescript:
ifeq (,$(shell which tsc))
	npm -g install tsc
endif

client/node_modules: client/package.json
	cd client && yarn && touch -m node_modules

install-client-packages: client/node_modules

.PHONY: install-js
install-js: install-client-packages
	cd server && yarn && cd ..
	cd ingest && yarn && cd ..
	cd dashboard-search && yarn && cd ..
	cd dashboard-client && yarn && cd ..

install_ts_node:
ifeq (,$(shell which ts-node))
	npm -g install ts-node
endif

.PHONY: install
install: install_docker_compose install_hasura_cli install_yarn install_quasar install-js install_ts_node install_typescript
	echo 'Installing'

##############################################################################
# Primary Commands
##############################################################################

load_authors:
	cd ingest && ts-node loadAuthors.ts && cd ..

load_author_attributes:
	cd ingest && ts-node loadAuthorAttributes.ts && cd ..

ingest_metadata:
	cd ingest && ts-node ingestMetadataByDoi.ts && cd ..

load_new_confidence_sets:
	cd ingest && ts-node updateConfidenceReviewStates.ts && cd ..

synchronize_reviews:
	cd ingest && ts-node synchronizeReviewStates.ts && cd ..

load_abstracts:
	cd ingest && ts-node loadAbstracts.ts && cd ..

load_awards:
	cd ingest && ts-node loadAwards.ts && cd ..

update_pub_journals:
	cd ingest && ts-node updatePublicationsJournals.ts && cd ..

recheck_author_matches:
	cd ingest && ts-node updatePersonPublicationsMatches.ts && cd ..

migrate:
	cd hasura && hasura migrate apply && cd ..

newdb:
	cd ingest && ts-node loadAuthors.ts && cd ..
	cd ingest && ts-node loadAuthorAttributes.ts && cd ..
	cd ingest && ts-node ingestMetadataByDoi.ts && cd ..
	cd ingest && ts-node updateConfidenceReviewStates.ts && cd ..
	cd ingest && ts-node loadAwards.ts && cd ..
	cd ingest && ts-node loadFunders.ts && cd ..
	cd ingest && ts-node loadAbstracts.ts && cd ..
	cd ingest && ts-node loadJournals.ts && cd ..
	cd ingest && ts-node updatePublicationsJournals.ts && cd ..
	cd ingest && ts-node loadJournalsImpactFactors.ts && cd ..

reharvest:
	cd ingest && ts-node loadAuthors.ts && cd ..
	cd ingest && ts-node loadAuthorAttributes.ts && cd ..
	cd ingest && ts-node ingestMetadataByDoi.ts && cd ..
	cd ingest && ts-node updateConfidenceReviewStates.ts && cd ..
	cd ingest && ts-node synchronizeReviewStates.ts && cd ..
	cd ingest && ts-node loadAwards.ts && cd ..
	cd ingest && ts-node loadAbstracts.ts && cd ..
	cd ingest && ts-node updatePublicationsJournals.ts && cd ..

update_crossref_data:
	cd ingest && ts-node fetchCrossRefAuthorData.ts && cd ..

update_semantic_scholar_data:
	cd ingest && ts-node fetchSemanticScholarAuthorData.ts && cd ..

update_wos_data:
	cd ingest && ts-node fetchWoSAuthorDataNewModel.ts && cd ..

update_pubmed_data:
	cd ingest && ts-node fetchPubmedData.js && cd ..
	cd ingest && ts-node joinAuthorAwards.js && cd ..
	cd ingest && ts-node fetchPubmedDataByAuthor.ts && cd ..
	cd ingest && ts-node joinAuthorPubmedPubs.js && cd ..

update_scopus_data:
	cd ingest && ts-node fetchScopusAuthorData.ts && cd ..

update_scopus_full_text_data:
	cd ingest && ts-node fetchScopusFullTextData.ts && cd ..

load_journals:
	cd ingest && ts-node loadJournals.ts && cd ..
	cd ingest && ts-node updatePublicationsJournals.ts && cd ..
	cd ingest && ts-node loadJournalsImpactFactors.ts && cd ..

load_impact_factors:
	cd ingest && ts-node loadJournalsImpactFactors.ts && cd ..

load_funders:
	cd ingest && ts-node loadFunders.ts && cd ..

update_awards_funders:
	cd ingest && ts-node updateAwardsFunders.ts && cd ..

scopus_author_data:
	cd ingest && ts-node fetchScopusAuthorObjects.ts && cd ..

dashboard-ingest:
	cd dashboard-search && ts-node src/ingest.ts && cd ..

mine_semantic_scholar_ids:
	cd ingest && ts-node mineSemanticScholarAuthorIds.ts && cd ..

.PHONY: start-docker
start-docker:
	DOCKER_HOST_IP=$(DOCKER_HOST_IP) docker-compose up -d

.PHONY: stop-docker
stop-docker:
	docker-compose down

.PHONY: client
#: Start the client dev server
client: install-client-packages
	cd client && quasar dev && cd ..

.PHONY: server
#: Start the express server
server:
	cd server && ts-node src/index.ts && cd ..

.PHONY: dashboard-client
dashboard-client:
	cd dashboard-client && quasar dev && cd ..

.PHONY: docker
#: Run docker containers in docker-compose in the background
docker:
	DOCKER_HOST_IP=$(DOCKER_HOST_IP) docker-compose up -d

.PHONY: logs
#: Tail docker logs
logs:
	@DOCKER_HOST_IP=$(DOCKER_HOST_IP) docker-compose logs -f

.PHONY: update-pdfs
update-pdfs:
	cd ingest && ts-node downloadFile.ts && cd ..

.PHONY: migration-console
#: Start the Hasura migration console
migration-console:
	cd hasura && hasura console && cd ..

##############################################################################
# Clean-up tasks
##############################################################################
.PHONY: clear-pdfs
#: Remove pdfs and thumbnails
clear-pdfs:
	rm data/pdfs/*
	rm data/thumbnails/*

.PHONY: cleardb
#: Clear the database by destroying the docker volumes
cleardb:
ifeq ($(ENV),prod)
ifneq ($(CONFIRM),true)
	@echo "You can only clear the database in ENV=prod mode when CONFIRM=true."
	@echo
	@exit 1;
else
	@echo "Clearing the production database..."
	@DOCKER_HOST_IP=$(DOCKER_HOST_IP) docker-compose \
		-f docker-compose.yml \
		down -v --remove-orphans
endif
else
	@echo "Clearing the database..."
	@DOCKER_HOST_IP=$(DOCKER_HOST_IP) docker-compose \
		-f docker-compose.yml \
		down -v --remove-orphans
endif

##############################################################################
# Aliases
##############################################################################
.PHONY: install_js
install_js: install-js

.PHONY: start_docker
start_docker: start-docker

.PHONY: stop_docker
stop_docker: stop-docker

.PHONY: update_pdfs
update_pdfs: update-pdfs

.PHONY: clear_pdfs
clear_pdfs: clear-pdfs

.PHONY: migration_console
migration_console: migration-console

##############################################################################
# Epilogue
##############################################################################
.DEFAULT_GOAL := help