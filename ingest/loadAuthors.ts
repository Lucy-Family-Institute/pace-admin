
import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import gql from 'graphql-tag'
import fetch from 'node-fetch'

//import _ from 'lodash'
const _ = require('lodash')
import { command as loadCsv } from './units/loadCsv'

const INSTITUTION = "University of Notre Dame"

const INSERT_INSTITUTION_MUTATION = gql`

    mutation InsertInstitutionMutation ($institutions:[institutions_insert_input!]!){
    __typename

    insert_institutions(
      objects: $institutions
    ) {
      returning {
        id
        name
      }
    }
  }`



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
        path: '../data/hcri_researchers_10_24_19.csv',
    });

    console.log(authors);

    //insert institutions first
    const institutions = _.uniq(_.map(authors, 'INSTITUTION'))
    console.log(institutions)

    const result = await client.mutate({
        mutation: INSERT_INSTITUTION_MUTATION,
        variables: {
            institutions: _.map(institutions, i => ({ name: i}))
        }
    });

    console.log(result);

    //get indexed id's for institutions, and update author list with id's for inserts

    //console.log(result.data.returning)

    //now add auth

    //console.log(result)
}

go();