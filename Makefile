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
# Primary Commands
##############################################################################

include makefiles/dependencies.mk
include makefiles/ingest.mk
include makefiles/hasura.mk
include makefiles/docker.mk
include makefiles/cleanup.mk
include makefiles/aliases.mk

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
	cd server && REDIS_HOST=localhost REDIS_PORT=6379 ts-node src/index.ts && cd ..

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

.PHONY=setup-restore
setup-restore: docker-database-restore sleep-45 docker sleep-25 migrate add-dev-user dashboard-ingest

.PHONY=setup-new
setup-new: docker sleep-15 migrate add-dev-user

.PHONY: setup
setup: 
ifdef DUMP_PATH
	@$(RUN_MAKE) setup-restore
else
	@$(RUN_MAKE) setup-new
endif

# SPA_SOURCE_FILES := $(shell find ./client/spa -type f)

# $(BUILD_DIR)/spa: .env

.PHONY: build-spa
build-spa:
	@cd client && yarn run build

.PHONY: prod
prod: build-spa docker

.PHONY: clone-volume
#: make clone-volume from=volumeName to=volumeNameBackup
clone-volume:
	docker volume create --name $(to)
	docker container run --rm -it \
						-v $(from):/from \
						-v $(to):/to \
						alpine ash -c "cd /from ; cp -av . /to"

##############################################################################
# Epilogue
##############################################################################
include makefiles/utilities.mk
.DEFAULT_GOAL := help