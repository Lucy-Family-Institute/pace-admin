import _ from 'lodash'
import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import pMap from 'p-map'
import pTimes from 'p-times'
import { command as loadCsv } from './units/loadCsv'
import { split } from 'apollo-link'
import cslParser from './units/cslParser' 
import { command as writeCsv } from './units/writeCsv'
import moment from 'moment'
import dotenv from 'dotenv'
import resolve from 'path'

dotenv.config({
  path: '../.env'
})

const fs = require('fs');
const axios = require('axios');
const elsApiKey = process.env.SCOPUS_API_KEY
const elsCookie = process.env.SCOPUS_API_COOKIE

// environment variables
process.env.NODE_ENV = 'development';

// uncomment below line to test this code against staging environment
// process.env.NODE_ENV = 'staging';

// config variables
// const config = require('../config/config.js');

async function getScopusAuthorObjects (authLast, affiliation) {

  console.log(`Cookie is: ${elsCookie}`)
  const query = `authlast(${authLast}) and affil(${affiliation})`
  const baseUrl = `https://api-elsevier-com.proxy.library.nd.edu/content/search/author?query=${query}&apiKey=${elsApiKey}`
  console.log(`Url is: ${baseUrl}`)
  const response = await axios.get(baseUrl, {
    headers: {
      'httpAccept' : 'text/xml',
      'X-ELS-APIKey' : elsApiKey,
      'Cookie': elsCookie
    },
    withCredentials: true
  });

  console.log(`Author objects returned are: ${JSON.stringify(response.data, null, 2)}`)
}


async function main (): Promise<void> {

  getScopusAuthorObjects('stack', 'University of Notre Dame')
}
  
main();


