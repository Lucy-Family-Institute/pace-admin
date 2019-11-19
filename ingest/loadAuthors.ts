
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
      on_conflict: {constraint: institutions_name_key, update_columns: name}
    ) {
      returning {
        id
        name
      }
    }
  }`

  const INSERT_PERSON_MUTATION = gql`
  mutation InsertPersonMutation ($persons:[persons_insert_input!]!){
    __typename

    insert_persons(
      objects: $persons
    ) {
      returning {
        id,
        given_name,
        family_name,
        email,
        position_title,
        institution {
            name
        }
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
    const institutions = _.uniq(_.map(authors, 'institution'))
    console.log(institutions)

    const result = await client.mutate({
        mutation: INSERT_INSTITUTION_MUTATION,
        variables: {
            institutions: _.map(institutions, i => ({ name: i}), {})
        }
    });

    console.log(JSON.stringify(result.data));
    //get indexed id's for institutions, and update author list with id's for inserts

    const inserted_institutions = result.data["insert_institutions"]["returning"] || []
    const institutionNameIdMap = _.reduce(inserted_institutions, (obj,inst) => {
        if(inst.name && inst.id)
            obj[inst['name']] = inst['id']
        return obj
    }, {})
    // console.log(inserted_institutions)
    // console.log(institutionNameIdMap)

    //now add authors
    const authors_with_ids = _.map(authors, author => {
        const obj = {
            "family_name": author["family_name"],
            "given_name": author["given_name"],
            "email": author["email"],
            "position_title": author["position_title"]
        }
        if (institutionNameIdMap[author["institution"]]) 
            obj["institution_id"] = institutionNameIdMap[author["institution"]]
        return obj 
    })
    console.log(authors_with_ids)

    const resultInsertAuthors = await client.mutate({
        mutation: INSERT_PERSON_MUTATION,
        variables: {
            persons: authors_with_ids
        }
    });

    console.log(resultInsertAuthors)
}

go();