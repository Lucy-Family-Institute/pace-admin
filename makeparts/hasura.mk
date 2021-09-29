######################################
### Hasura

HASURA_CLI := docker-compose exec hasura hasura-cli \
	--project /hasura \
	--admin-secret $(HASURA_SECRET) \
	--skip-update-check

HASURA_CLI_FROM_DOCKER:=docker \
	run \
	--rm -it \
	--network $(COMPOSE_PROJECT_NAME)_default \
	--entrypoint hasura-cli \
	-v $(PWD)/hasura:/hasura \
	-p 9695:9695 \
	hasura/graphql-engine:v2.0.7.cli-migrations-v2 \
	--project /hasura

.PHONY: hasura-migrate
hasura-migrate:
	@$(HASURA_CLI) migrate apply --database-name default

.PHONY: hasura-metadata
hasura-metadata:
	@$(HASURA_CLI) metadata apply

.PHONY: migrate
#: Run Hasura migrations against the database
migrate: hasura-migrate hasura-metadata

.PHONY: hasura-status
#: Run Hasura migrations against the database
hasura-status:
	$(HASURA_CLI) migrate status --database-name default

.PHONY: migration-console
#: Start the Hasura migration console
migration-console:
	cd hasura && hasura console \
		--no-browser \
		--endpoint http://localhost:${HASURA_PORT} \
		--admin-secret $(HASURA_SECRET)
		--use-server-assets

# .PHONY: console
# console:
# 	$(HASURA_CLI) console \
# 		--no-browser \
# 		--endpoint http://127.0.0.1:8080 \
# 		--address 127.0.0.1 \
# 		--admin-secret $(HASURA_SECRET)