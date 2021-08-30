##############################################################################
# Clean-up tasks
##############################################################################
CLEAN_REQS =\
	NODE_DIRS

.PHONY: clean
#: Clean the build folder and all node_module folders by deleting them
clean: $(addprefix env-, $(CLEAN_REQS))
	@rm -rf build server/dist $(addsuffix /node_modules, $(NODE_DIRS))

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
	@echo "Removing pdfs and thumbnails"
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
	@echo "Clearing the database..."
	@DOCKER_HOST_IP=$(DOCKER_HOST_IP) docker-compose \
		-f docker-compose.yml \
		down -v --remove-orphans
