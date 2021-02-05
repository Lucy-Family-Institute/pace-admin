include .env

# TODO differentiate WSL Linux and Linux see:
# https://stackoverflow.com/questions/38086185/how-to-check-if-a-program-is-run-in-bash-on-ubuntu-on-windows-and-not-just-plain
UNAME := $(shell uname -s)
SYSTEM = Linux

ifeq ($(UNAME),Linux)
	ifeq ($(WSL),1)
		SYSTEM = 'WSL'
	endif
	else
	ifeq ($(UNAME),Darwin)
		SYSTEM = 'Mac'
	else
		SYSTEM = 'Windows'
	endif
endif

DOCKER_HOST_IP = host.docker.internal
ifeq ($(SYSTEM),Linux)
	DOCKER_HOST_IP=$(shell ip -4 addr show docker0 | grep -Po 'inet \K[\d.]+')
endif

.PHONY: install client dashboard-client server

info:
	@echo $(UNAME), $(WSL), $(SYSTEM), $(DOCKER_HOST_IP)

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

install_js:
	cd client && yarn && cd ..
	cd server && yarn && cd ..
	cd ingest && yarn && cd ..
	cd dashboard-search && yarn && cd ..
	cd dashboard-client && yarn && cd ..

install_ts_node:
ifeq (,$(shell which ts-node))
	npm -g install ts-node
endif


update_confidence_reviews:
	cd ingest && ts-node updateConfidenceReviewStates.ts && cd ..

cleardb:
	DOCKER_HOST_IP=$(DOCKER_HOST_IP) docker-compose down -v
migrate:
	cd hasura && hasura migrate apply && cd ..
newdb:
	cd ingest && ts-node loadAuthors.ts && cd ..
	cd ingest && ts-node loadAuthorNameVariances.ts && cd ..
	cd ingest && ts-node ingestMetadataByDoi.ts && cd ..
	cd ingest && ts-node updateConfidenceReviewStates.ts && cd ..
	cd ingest && ts-node loadAwards.ts && cd ..
	cd ingest && ts-node loadFunders.ts && cd ..
	cd ingest && ts-node loadAbstracts.ts && cd ..
	cd ingest && ts-node loadJournals.ts && cd ..
	cd ingest && ts-node updatePublicationsJournals.ts && cd ..
	cd ingest && ts-node loadJournalsImpactFactors.ts && cd ..

reharvest:
	cd ingest && ts-node ingestMetadataByDoi.ts && cd ..
	cd ingest && ts-node updateConfidenceReviewStates.ts && cd ..
	cd ingest && ts-node loadAwards.ts && cd ..
	cd ingest && ts-node loadAbstracts.ts && cd ..
	cd ingest && ts-node updatePublicationsJournals.ts && cd ..

load_authors:
	cd ingest && ts-node loadAuthors.ts && cd ..

load_name_variances:
	cd ingest && ts-node loadAuthorNameVariances.ts && cd ..

load_new_confidence_sets:
	cd ingest && ts-node updateConfidenceReviewStates.ts && cd ..

update_wos_data:
	cd ingest && ts-node fetchWoSAuthorData.ts && cd ..

update_pubmed_data:
	cd ingest && ts-node fetchPubmedData.js && cd ..
	cd ingest && ts-node joinAuthorAwards.js && cd ..
	cd ingest && ts-node fetchPubmedDataByAuthor.js && cd ..
	cd ingest && ts-node joinAuthorPubmedPubs.js && cd ..

update_scopus_data:
	cd ingest && ts-node fetchScopusAuthorData.ts && cd ..

update_scopus_full_text_data:
	cd ingest && ts-node fetchScopusFullTextData.ts && cd ..

load_abstracts:
	cd ingest && ts-node loadAbstracts.ts && cd ..

load_awards:
	cd ingest && ts-node loadAwards.ts && cd ..

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

update_pub_journals:
	cd ingest && ts-node updatePublicationsJournals.ts && cd ..

scopus_author_data:
	cd ingest && ts-node fetchScopusAuthorObjects.ts && cd ..

dashboard-ingest:
	cd dashboard-search && ts-node src/ingest.ts && cd ..

install: install_docker_compose install_hasura_cli install_yarn install_quasar install_js install_ts_node install_typescript
	echo 'Installing'

start_docker:
	DOCKER_HOST_IP=$(DOCKER_HOST_IP) docker-compose up -d
stop_docker:
	docker-compose down

client:
	cd client && quasar dev && cd ..
server:
	cd server && ts-node src/index.ts && cd ..

dashboard-client:
	cd dashboard-client && quasar dev && cd ..

docker:
	DOCKER_HOST_IP=$(DOCKER_HOST_IP) docker-compose up

clear_pdfs:
	rm data/pdfs/*
	rm data/thumbnails/*

migration_console:
	cd hasura && hasura console && cd ..
