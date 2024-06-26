######################################
### Docker

# This will run if any of the build files have been directly changed (i.e, a no-no),
# if the templates folder has changed (e.g., a file has been added or removed).
# or if any of the template files have changed.
# We touch the build folder for good measure.
$(BUILD_TEMPLATES_DIR): $(ENV_PATH) $(TEMPLATES_DIR) $(TEMPLATES_FILES) 
	@echo Running gomplate...
	@mkdir -p $(BUILD_TEMPLATES_DIR)
	@docker run \
		--user $(UID):$(GID) \
		--env-file $(ENV_PATH) \
		--env DOCKER_HOST_IP=$(DOCKER_HOST_IP) \
		--env ENV=$(ENV) \
		-v $(CURRENT_DIR)/$(TEMPLATES_DIR):/input \
		-v $(CURRENT_DIR)/$(BUILD_TEMPLATES_DIR):/output \
		hairyhenderson/gomplate \
		--input-dir /input \
		--output-dir /output
	@touch $(BUILD_TEMPLATES_DIR)

docker-database-restore: $(BUILD_TEMPLATES_DIR)
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
	@echo "Now make stop-docker and make docker or make prod; you may need to also run make migrate"

DOCKER_REQS := \
	BUILD_TEMPLATES_DIR \
	DOCKER_HOST_IP \
	ENV \
	UID \
	GID \
	POSTGRES_USER \
	POSTGRES_PASSWORD \
	POSTGRES_PORT \
	POSTGRES_DOCKER_PORT \
	HASURA_PORT \
	HASURA_DOCKER_PORT \
	HASURA_SECRET \
	HASURA_DATABASE \
	HASURA_ENABLE_CONSOLE \
	HASURA_WEBHOOK \
	KEYCLOAK_DATABASE \
	KEYCLOAK_USERNAME \
	KEYCLOAK_PASSWORD \
	KEYCLOAK_PORT \
	KEYCLOAK_DOCKER_PORT \
	MEILI_PORT \
	MEILI_DOCKER_PORT \
	MEILI_KEY \
	NGINX_PORT \
	PDFS_PATH \
	THUMBNAILS_PATH \
	NGINX_DOCKER_PORT \
	REDIS_PORT \
	REDIS_DOCKER_PORT

build/flags/.docker-build: $(ENV_PATH) $(SERVER_DIR) $(SERVER_FILES)
	@docker-compose $(DC_$(ENV)) build
	@mkdir -p build/flags
	@touch build/flags/.docker-build

DC_UP_FLAGS := -d --remove-orphans
ifeq ($(ENV), prod)
 DC_UP_FLAGS := --scale express=2 $(DC_UP_FLAGS)
endif

.PHONY: docker
#: Run docker containers in docker-compose in the background
docker: $(addprefix env-, $(DOCKER_REQS)) $(BUILD_TEMPLATES_DIR) build/flags/.docker-build
	@DOCKER_HOST_IP=$(DOCKER_HOST_IP) ENV=$(ENV) UID=$(UID) GID=$(GID) \
		docker-compose $(DC_$(ENV)) \
			up $(DC_UP_FLAGS)
ifeq ($(ENV),dev)
	@echo
	@echo You may want to now run make express, webapp, and migration-console.
	@echo
endif

.PHONY: logs
#: Tail docker logs; use make logs service=dockername to print specific logs
logs: env-DOCKER_HOST_IP
	@DOCKER_HOST_IP=$(DOCKER_HOST_IP) docker-compose $(DC_$(ENV)) logs -f $(service)

.PHONY: docker-stop
#: Stop docker
docker-stop:
	@DOCKER_HOST_IP=$(DOCKER_HOST_IP) \
		docker-compose $(DC_$(ENV)) down

.PHONY: docker-restart
#: Restart docker
docker-restart: docker-stop docker