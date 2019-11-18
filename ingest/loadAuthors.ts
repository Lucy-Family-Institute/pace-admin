
import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { createHttpLink } from 'apollo-link-http';
import gql from 'graphql-tag';
import fetch from 'node-fetch';

const _ = require('lodash');
const loadCsv = require('./units/loadCsv').command;

const client = new ApolloClient({
    link: createHttpLink({ 
        uri: 'http://localhost:8002/v1/graphql',
        headers: {
            "x-hasura-admin-secret": "mysecret"
        }, 
        fetch
  }),
    cache: new InMemoryCache()
  });

async function go() {
    const authors = await loadCsv({
        path: './data/hcri_researchers_10_24_19.csv',
    });
}

go();