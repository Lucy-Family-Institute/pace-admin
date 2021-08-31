######################################
### Hasura

HASURA_FLAGS= \
	--admin-secret $(HASURA_SECRET) \
	--endpoint $(APP_BASE_URL) \
	--skip-update-check

.PHONY: migrate
#: Run Hasura migrations against the database
migrate:
	cd hasura && \
	hasura migrate apply $(HASURA_FLAGS) && \
	hasura metadata apply $(HASURA_FLAGS)

.PHONY: migration-console
#: Start the Hasura migration console
migration-console:
	cd hasura && hasura console && cd ..