import _ from 'lodash'
import { command as loadCsv } from './units/loadCsv'

const axios = require('axios');
const elsApiKey = '[INSERT_KEY]'

// environment variables
process.env.NODE_ENV = 'development';

// uncomment below line to test this code against staging environment
// process.env.NODE_ENV = 'staging';

// config variables
const config = require('../config/config.js');

async function wait(ms){
    return new Promise((resolve, reject)=> {
      setTimeout(() => resolve(true), ms );
    });
  }

async function getScopusAuthorData(authorGivenName, authorFamilyName){
    const baseUrl = 'https://api.elsevier.com/content/search/scopus'
    
    const affiliationId = "60021508"

    //const authorQuery = (query) {
    //  return {
    //    "AF-ID("+ affiliationId + ")"
    //  }
    //}
    const authorQuery = "AUTHFIRST("+ authorGivenName +") and AUTHLASTNAME("+ authorFamilyName+")"
      

    const response = await axios.get(baseUrl, {
        headers: {
          'X-ELS-APIKey' : elsApiKey,
        },
        params: {
          query : authorQuery
        }
      });

      return response.data;
    
}

async function getScopusPaperData(doi){
  const baseUrl = 'https://api.elsevier.com/content/search/scopus'
  
  const affiliationId = "60021508"

  //const authorQuery = (query) {
  //  return {
  //    "AF-ID("+ affiliationId + ")"
  //  }
  //}
  const doiQuery = "DOI(" + doi + ")" 

  const response = await axios.get(baseUrl, {
      headers: {
        'X-ELS-APIKey' : elsApiKey,
      },
      params: {
        query : doiQuery
      }
    });

    return response.data;
  
}

async function getScopusPaperFullText (doi) {
  const baseUrl = 'https://api.elsevier.com/content/article/eid/1-s2.0-S152500161830594X'

  const fullUrl = baseUrl + doi
      

    const response = await axios.get(baseUrl, {
        headers: {
          'httpAccept' : 'text/xml',
          'X-ELS-APIKey' : elsApiKey,
        }
      });

      //console.log(response.data)
      return response.data;
}

async function getScopusAuthorAffiliation (scopusId) {
  const baseUrl = 'https://api.elsevier.com/content/abstract/scopus_id/85059466526?field=author,affiliation'

  //const fullUrl = baseUrl + doi
      

    const response = await axios.get(baseUrl, {
        headers: {
          'httpAccept' : 'text/xml',
          'X-ELS-APIKey' : elsApiKey,
        }
      });

      //console.log(response.data)
      return response.data;
}

async function main (): Promise<void> {
    
  // ingest list of DOI's from CSV and relevant center author name
  const authorPapers: any = await loadCsv({
    path: '../data/HCRI-pubs-2010-2019_-_Faculty_Selected.csv'
  })

  console.log(authorPapers)

  const papersByDoi = _.keyBy(authorPapers, 'DOI')
  console.log(papersByDoi)

  // iterate through list of DOI's and...
  const scopusPapers = _.forEach(papersByDoi, async function(value, key) {

    console.log(`DOI is: ${ key }`)
    // fetch paper by DOI
    try {
      const responseDoi = await getScopusPaperData(key);
        if( responseDoi ) {
          console.log(`Result found for DOI: ${ key }`)
          //console.log(JSON.stringify(responseDoi['search-results'],null,2));
          //get paper scopus id
          // const entries = _.map(responseDoi['search-results'],'entry')
          if ( responseDoi['search-results']['entry'] ){
            if (responseDoi['search-results']['entry'][0]['dc:identifier']){
              const paperScopusId = responseDoi['search-results']['entry'][0]['dc:identifier'].split(':')[1]
              console.log(paperScopusId)
              //get author affiliation
              const responseAuthorAffiliation = await getScopusAuthorAffiliation(paperScopusId);
              if( responseAuthorAffiliation ) {
                console.log('Here1')
                const authors = _.map(responseAuthorAffiliation['abstracts-retrieval-response']['authors']['author'], function (value) {
                  console.log(`Value is: ${ JSON.stringify(value,null,2)}`)
                  console.log(`Surname: ${ JSON.stringify(value['ce:surname'])}`)
                  const author = {
                    'family' : value['ce:surname'],
                    'given' : value['ce:given-name'],
                    'givenInitials' : value['ce:initials'],
                    'scopusId' : value['@auid'],
                    'affiliationId' : value['affiliation']['@id']
                  }
                  return author
                })
                //console.log(JSON.stringify(responseFullText['full-text-retrieval-response'],null,2));
                console.log(`Here: ${ JSON.stringify(responseAuthorAffiliation,null,2) }`);
                console.log(`Here2: ${ JSON.stringify(authors,null,2) }`);

                //   //push to datastore
                //   //start with pushing to csv one row for each relevant author + doi + each author name variant and/or + orcid id + scopus id
                //   //doi, paper title, author list (name+id)

                // // match to target author for HCRI

                // // get full text

                // // mine for name of author variation

                // // capture name variant and ids
              }
            }
          }
        }
    } catch (error){
      console.log(`Error for DOI: ${ key }`)
      // console.error(error)
    }
  })

      //   //get full text
      //   const responseFullText = await getScopusPaperFullText("10.1016/j.ymthe.2018.12.010");
      //   if( responseFullText ) {
      //     //console.log(JSON.stringify(responseFullText['full-text-retrieval-response'],null,2));
      //     //console.log(responseFullText);
      //   }

      // //const responseFullText = await getFullText(10);
      // //if( responseFullText ) {
      // //  console.log(responseFullText);
      // //}
      console.log(`Config is: ${JSON.stringify(config)}`)
  }
  
  main();


