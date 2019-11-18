.PHONY: install dev

install:
	curl -L https://github.com/hasura/graphql-engine/raw/master/cli/get.sh | bash
	npm -g install yarn
	npm -g install quasar
	cd client && yarn && cd ..

docker:
	docker-compose up
client:
	cd client && quasar dev && cd ..