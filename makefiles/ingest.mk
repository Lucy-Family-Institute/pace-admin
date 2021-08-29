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

.PHONY: dashboard-ingest
dashboard-ingest:
	cd dashboard-search && ts-node src/ingest.ts && cd ..