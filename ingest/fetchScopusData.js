const axios = require('axios');

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

async function getNDPublications(){
    const records = await getScopusSearch(params);
    return records;
}

async function getFullText(recordId){
  //baseUrl = 'https://api.elsevier.com/content/article/eid/1-s2.0-S0167739X18314687';
  baseUrl = 'https://api.elsevier.com/content/article/pii/S0167739X18314687';
    
    const responseFullText = await axios.get(baseUrl, {
        headers: {
            'X-ELS-APIKey' : global.gConfig.els_api_key,
        },
        //params: {
        //  query : "AF-ID(" + global.gConfig.affiliation_id + ")"
        //}
      });

      return responseFullText.data;
}

async function getScopusSearch(params){
    baseUrl = 'https://api.elsevier.com/content/search/scopus';
    
    const response = await axios.get(baseUrl, {
        headers: {
            'X-ELS-APIKey' : global.gConfig.els_api_key,
        },
        params: {
          query : "AF-ID(" + global.gConfig.affiliation_id + ")"
        }
      });

      return response.data;
    
}

async function go() {
    
      const response = await getScopusSearch();
      if( response ) {
        console.log(response);
      }

      const responseFullText = await getFullText(10);
      if( responseFullText ) {
        console.log(responseFullText);
      }
  }
  
  go();


