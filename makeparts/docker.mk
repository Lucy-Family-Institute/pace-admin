######################################
### Docker

DC_prod := docker-compose -f docker-compose.yml -f docker-compose.prod.yml
DC_dev := docker-compose -f docker-compose.yml

# This will run if any of the build files have been directly changed (i.e, a no-no),
# if the templates folder has changed (e.g., a file has been added or removed).
# or if any of the template files have changed.
# We touch the build folder for good measure.
TEMPLATES_FILES := $(shell find ./$(TEMPLATES_DIR) -type f)
BUILD_FILES := $(shell find ./$(BUILD_DIR) -type f)
$(BUILD_DIR): .env $(BUILD_FILES) $(TEMPLATES_DIR) $(TEMPLATES_FILES) 
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

.PHONY: docker
#: Run docker containers in docker-compose in the background
docker: $(addprefix env-, $(DOCKER_REQS)) $(BUILD_DIR)
	@$(DC_$(ENV)) build
	@DOCKER_HOST_IP=$(DOCKER_HOST_IP) ENV=$(ENV) UID=$(UID) GID=$(GID) \
		$(DC_$(ENV)) up -d

.PHONY: logs
#: Tail docker logs; use make logs service=dockername to print specific logs
logs: env-DOCKER_HOST_IP
	@DOCKER_HOST_IP=$(DOCKER_HOST_IP) $(DC_$(ENV)) logs -f $(service)

.PHONY: docker-stop
#: Stop docker
docker-stop:
	@DOCKER_HOST_IP=$(DOCKER_HOST_IP) \
		$(DC_$(ENV)) down

.PHONY: docker-restart
#: Restart docker
docker-restart: docker-stop docker