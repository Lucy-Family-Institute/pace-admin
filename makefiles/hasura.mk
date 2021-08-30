######################################
### Hasura

.PHONY: migrate
#: Run Hasura migrations against the database
migrate:
	cd hasura && hasura migrate apply && hasura metadata apply

.PHONY: migration-console
#: Start the Hasura migration console
migration-console:
	cd hasura && hasura console && cd ..