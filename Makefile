##############################################################################
# Includes
##############################################################################
include .env

##############################################################################
# Prologue
##############################################################################
# MAKEFLAGS += --warn-undefined-variables

ifndef ENV
$(info Please set ENV to 'dev' or 'prod' in your .env file.)
endif

ifndef CONFIRM
CONFIRM := 0
endif

UID := $(shell id -u)
GID := $(shell id -g)

ENV_PATH := $(PWD)/.env

NODE_DIRS := client server ingest dashboard-search node-admin-client

TEMPLATES_DIR := templates
BUILD_DIR := build

WSL := $(if $(shell command -v bash.exe 2> /dev/null),1,0)
UNAME := $(shell uname -s)
DOCKER_HOST_IP := host.docker.internal
ifeq ($(UNAME),Linux)
	ifneq ($(WSL),1)
		DOCKER_HOST_IP := $(shell ip -4 addr show docker0 | grep -Po 'inet \K[\d.]+')
	endif
endif

RUN_MAKE := ENV=$(ENV) CONFIRM=$(CONFIRM) $(MAKE)

##############################################################################
# Utilities
##############################################################################

.PHONY: env
env:
env-%:
	@ if [ -z '${${*}}' ]; then echo 'Environment variable $* not set.' && exit 1; fi

.PHONY: sleep
sleep:
sleep-%: sleep
	@echo Sleeping - back momentarily...
	@sleep $*

.PHONY: help
help: # Source: https://stackoverflow.com/a/59087509
	@grep -B1 -E "^[a-zA-Z0-9_-]+\:([^\=]|$$)" Makefile \
     | grep -v -- -- \
     | sed 'N;s/\n/###/' \
     | sed -n 's/^#: \(.*\)###\(.*\):.*/\2###\1/p' \
     | column -t  -s '###'

##############################################################################
# Install/Update Dependencies
##############################################################################

install-yarn:
ifeq (,$(shell which yarn))
	npm -g install yarn
endif

install-quasar:
ifeq (,$(shell which quasar))
	npm install -g @quasar/cli
endif

%/node_modules: %/package.json
	cd $(@D) && yarn && touch -m node_modules

.PHONY: update-js
#: Force an update of all node_modules directories; mostly unnecessary
update-js: env-NODE_DIRS $(addsuffix /node_modules, $(NODE_DIRS))

.PHONY: install
install: \
	install-yarn \
	install-quasar \
	update-js 
	@echo 'Installing...'

##############################################################################
# Primary Commands
##############################################################################

######################################
### Ingest

load_authors: ingest/node_modules
	cd ingest && ts-node loadAuthors.ts && cd ..

load_author_attributes: ingest/node_modules
	cd ingest && ts-node loadAuthorAttributes.ts && cd ..

ingest_metadata: ingest/node_modules
	cd ingest && ts-node ingestMetadataByDoi.ts && cd ..

load_new_confidence_sets: ingest/node_modules
	cd ingest && ts-node updateConfidenceReviewStates.ts && cd ..

synchronize_reviews: ingest/node_modules
	cd ingest && ts-node synchronizeReviewStates.ts && cd ..

load_abstracts: ingest/node_modules
	cd ingest && ts-node loadAbstracts.ts && cd ..

load_awards: ingest/node_modules
	cd ingest && ts-node loadAwards.ts && cd ..

update_pub_journals: ingest/node_modules
	cd ingest && ts-node updatePublicationsJournals.ts && cd ..

recheck_author_matches: ingest/node_modules
	cd ingest && ts-node updatePersonPublicationsMatches.ts && cd ..

newdb: ingest/node_modules
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

reharvest: ingest/node_modules
	cd ingest && ts-node loadAuthors.ts && cd ..
	cd ingest && ts-node loadAuthorAttributes.ts && cd ..
	cd ingest && ts-node ingestMetadataByDoi.ts && cd ..
	cd ingest && ts-node updateConfidenceReviewStates.ts && cd ..
	cd ingest && ts-node synchronizeReviewStates.ts && cd ..
	cd ingest && ts-node loadAwards.ts && cd ..
	cd ingest && ts-node loadAbstracts.ts && cd ..
	cd ingest && ts-node updatePublicationsJournals.ts && cd ..

update_crossref_data: ingest/node_modules
	cd ingest && ts-node fetchCrossRefAuthorData.ts && cd ..

update_semantic_scholar_data: ingest/node_modules
	cd ingest && ts-node fetchSemanticScholarAuthorData.ts && cd ..

update_wos_data: ingest/node_modules
	cd ingest && ts-node fetchWoSAuthorDataNewModel.ts && cd ..

update_pubmed_data: ingest/node_modules
	cd ingest && ts-node fetchPubmedData.js && cd ..
	cd ingest && ts-node joinAuthorAwards.js && cd ..
	cd ingest && ts-node fetchPubmedDataByAuthor.ts && cd ..
	cd ingest && ts-node joinAuthorPubmedPubs.js && cd ..

update_scopus_data: ingest/node_modules
	cd ingest && ts-node fetchScopusAuthorData.ts && cd ..

update_scopus_full_text_data: ingest/node_modules
	cd ingest && ts-node fetchScopusFullTextData.ts && cd ..

load_journals: ingest/node_modules
	cd ingest && ts-node loadJournals.ts && cd ..
	cd ingest && ts-node updatePublicationsJournals.ts && cd ..
	cd ingest && ts-node loadJournalsImpactFactors.ts && cd ..

load_impact_factors: ingest/node_modules
	cd ingest && ts-node loadJournalsImpactFactors.ts && cd ..

load_funders: ingest/node_modules
	cd ingest && ts-node loadFunders.ts && cd ..

update_awards_funders: ingest/node_modules
	cd ingest && ts-node updateAwardsFunders.ts && cd ..

scopus_author_data: ingest/node_modules
	cd ingest && ts-node fetchScopusAuthorObjects.ts && cd ..

mine_semantic_scholar_ids: ingest/node_modules
	cd ingest && ts-node mineSemanticScholarAuthorIds.ts && cd ..

.PHONY: update-pdfs
update-pdfs: ingest/node_modules
	cd ingest && ts-node downloadFile.ts && cd ..

######################################
### Hasura

.PHONY: migrate
#: Run Hasura migrations against the database
migrate:
	cd hasura && hasura migrate apply && cd ..

.PHONY: migration-console
#: Start the Hasura migration console
migration-console:
	cd hasura && hasura console && cd ..

######################################
### Docker

# This will run if any of the build files have been directly changed (i.e, a no-no),
# if the templates folder has changed (e.g., a file has been added or removed).
# or if any of the template files have changed.
# We touch the build folder for good measure.
TEMPLATES_FILES := $(shell find ./$(TEMPLATES_DIR) -type f)
BUILD_FILES := $(shell find ./$(BUILD_DIR) -type f)
$(BUILD_DIR): $(BUILD_FILES) $(TEMPLATES_DIR) $(TEMPLATES_FILES) 
	@echo Running gomplate...
	@docker run \
		--user $(UID):$(GID) \
		--env-file $(ENV_PATH) \
		--env DOCKER_HOST_IP=$(DOCKER_HOST_IP) \
		--env ENV=$(ENV) \
		-v $(PWD)/$(TEMPLATES_DIR):/input \
		-v $(PWD)/$(BUILD_DIR):/output \
		hairyhenderson/gomplate \
		--input-dir /input \
		--output-dir /output
	@touch $(BUILD_DIR)

docker-database-restore: $(BUILD_DIR)
ifeq ($(ENV),dev)
else ifeq ($(CONFIRM),true)
else
	$(info )
	$(info You can only restore a database in ENV=prod mode when CONFIRM=true.)
	$(info )
	@exit 1;
endif
	@DOCKER_HOST_IP=$(DOCKER_HOST_IP) ENV=$(ENV) UID=$(UID) GID=$(GID) \
		docker-compose \
		-f docker-compose.restore.yml \
		up -d

DOCKER_REQS := \
	BUILD_DIR \
	DOCKER_HOST_IP \
	ENV \
	UID \
	GID \
	POSTGRES_USER \
	POSTGRES_PASSWORD \
	POSTGRES_PORT \
	HASURA_PORT \
	HASURA_SECRET \
	HASURA_DATABASE \
	HASURA_ENABLE_CONSOLE \
	HASURA_WEBHOOK \
	KEYCLOAK_DATABASE \
	KEYCLOAK_USERNAME \
	KEYCLOAK_PASSWORD \
	KEYCLOAK_PORT \
	MEILI_PORT \
	MEILI_KEY \
	NGINX_PORT

.PHONY: docker
#: Run docker containers in docker-compose in the background
docker: $(addprefix env-, $(DOCKER_REQS)) $(BUILD_DIR)
	@DOCKER_HOST_IP=$(DOCKER_HOST_IP) ENV=$(ENV) UID=$(UID) GID=$(GID) \
		docker-compose \
		-f docker-compose.yml \
		up -d

.PHONY: logs
#: Tail docker logs; use make logs service=dockername to print specific logs
logs: env-DOCKER_HOST_IP
	@DOCKER_HOST_IP=$(DOCKER_HOST_IP) docker-compose logs -f $(service)

.PHONY: docker-stop
#: Stop docker
docker-stop:
	docker-compose down

.PHONY: docker-restart
#: Restart docker
docker-restart: docker-stop docker

######################################
### Client

CLIENT_REQS := \
	GRAPHQL_END_POINT \
	MEILI_PUBLIC_KEY

.PHONY: client
#: Start the client dev server
client: $(addprefix env-, $(CLIENT_REQS)) client/node_modules
	cd client && quasar dev && cd ..

######################################
### Server
	
.PHONY: server
#: Start the express server
server: server/node_modules
	cd server && ts-node src/index.ts && cd ..

######################################
### Search

.PHONY: dashboard-ingest
dashboard-ingest:
	cd dashboard-search && ts-node src/ingest.ts && cd ..

ADD_DEV_USER_REQS := \
	AUTH_SERVER_URL \
	KEYCLOAK_USERNAME \
	KEYCLOAK_PASSWORD \
	KEYCLOAK_REALM \
	GRAPHQL_END_POINT \
	HASURA_SECRET \
	DEV_USER_EMAIL \
	DEV_USER_FIRST_NAME \
	DEV_USER_LAST_NAME \
	DEV_USER_PASSWORD

.PHONY: add-dev-user
add-dev-user: node-admin-client/node_modules $(addprefix env-, $(ADD_DEV_USER_REQS))
	@cd node-admin-client && yarn run add-users && cd ..

# .PHONY: add-dev-user
# add-dev-user:
# 	@$(RUN_MAKE) private-add-dev-user

.PHONY: setup
setup: cleardb docker-database-restore sleep-45 docker sleep-15 migrate add-dev-user dashboard-ingest

##############################################################################
# Clean-up tasks
##############################################################################
CLEAN_REQS =\
	NODE_DIRS

.PHONY: clean
#: Clean the build folder and all node_module folders by deleting them
clean: $(addprefix env-, $(CLEAN_REQS))
	@rm -rf build $(addsuffix /node_modules, $(NODE_DIRS))

.PHONY: clear-pdfs
#: Remove pdfs and thumbnails
clear-pdfs:
ifeq ($(ENV),dev)
else ifeq ($(CONFIRM),true)
else
	$(info )
	$(info You can only clear PDFS and thumbnails in ENV=prod mode when CONFIRM=true.)
	$(info )
	@exit 1;
endif
	@rm data/pdfs/* data/thumbnails/*

.PHONY: cleardb
#: Clear the database by destroying the docker volumes
cleardb:
ifeq ($(ENV),dev)
else ifeq ($(CONFIRM),true)
else
	$(info )
	$(info You can only clear the database in ENV=prod mode when CONFIRM=true.)
	$(info )
	@exit 1;
endif
	@echo "Clearing the production database..."
	@DOCKER_HOST_IP=$(DOCKER_HOST_IP) docker-compose \
		-f docker-compose.yml \
		down -v --remove-orphans

##############################################################################
# Aliases
##############################################################################

######################################
# Updating commands but trying not to
# break old code

.PHONY: install-js
install-js: update-js

.PHONY: install_js
install_js: update-js

.PHONY: start_docker
start_docker: docker

.PHONY: stop_docker
stop_docker: stop-docker

.PHONY: update_pdfs
update_pdfs: update-pdfs

.PHONY: clear_pdfs
clear_pdfs: clear-pdfs

.PHONY: migration_console
migration_console: migration-console

######################################
# Common aliases

.PHONY: stop-docker
stop-docker: docker-stop

.PHONY: start-docker
start-docker: docker

.PHONY: restart-docker
restart-docker: docker-restart

##############################################################################
# Epilogue
##############################################################################
.DEFAULT_GOAL := help