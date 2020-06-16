import axios from 'axios'
import _ from 'lodash'
import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import pEachSeries from 'p-each-series'
import readUsers from '../client/src/gql/readPersons'
import insertPublication from './gql/insertPublication'
import insertPersonPublication from './gql/insertPersonPublication'
import insertPubAuthor from './gql/insertPubAuthor'

import dotenv from 'dotenv'

dotenv.config({
  path: '../.env'
})

const hasuraSecret = process.env.HASURA_SECRET
const graphQlEndPoint = process.env.GRAPHQL_END_POINT

const client = new ApolloClient({
  link: createHttpLink({
    uri: graphQlEndPoint,
    headers: {
      'x-hasura-admin-secret': hasuraSecret
    },
    fetch: fetch as any
  }),
  cache: new InMemoryCache()
})

// var publicationId= undefined;

async function main() {
  const queryResult = await client.query(readUsers())
  const simplifiedPersons = _.map(queryResult.data.persons, (person) => {
    return {
      id: person.id,
      lastName: _.lowerCase(person.family_name),
      firstInitial: _.lowerCase(person.given_name[0])
    }
  })

  console.log(simplifiedPersons)

  pEachSeries(simplifiedPersons, async (person) => {
    const result = await axios({
      method: 'get',
      url: `https://api.crossref.org/works?query.author=${person.lastName}`,
      headers: { // TODO @rickjohnson change email address 
        'User-Agent': 'GroovyBib/1.1 (https://example.org/GroovyBib/; mailto:GroovyBib@example.org) BasedOnFunkyLib/1.4'
      }
    })

    let authorMap = new Map()
    // for now assuming each paper unique and not already in DB
    _.map(result.data.message.items, (item) => {

      if(item.type === 'journal-article' && item.title) {

        authorMap.set(item.title[0], {
          firstAuthors : [],
          otherAuthors : []
        })
        let authorCount = 0;
        let publicationId;
        
        _.each(item.author, async (author) => {
          authorCount += 1
          
          if (_.lowerCase(author.sequence) === 'first' ) {
            console.log(`found first author ${ JSON.stringify(author) }`)
            authorMap.get(item.title[0]).firstAuthors.push(author)
          } else {
            console.log(`found add\'l author ${ JSON.stringify(author) }`)
            authorMap.get(item.title[0]).otherAuthors.push(author)
          }
        })

        console.log(`Title: ${ item.title[0] }, First Authors: ${ JSON.stringify(authorMap.get(item.title[0]).firstAuthors) }`)
        console.log(`Title: ${ item.title[0] }, Other Authors: ${ JSON.stringify(authorMap.get(item.title[0]).otherAuthors) }`)
        
        _.each(item.author, async (author) => {
          authorCount += 1
          if(_.lowerCase(author.family) === person.lastName && 
            _.startsWith(_.lowerCase(author.given), person.firstInitial)
          ) {
            let confidence = .50
            if(!_.isEmpty(author.affiliation)) {
              if(/notre dame/gi.test(author.affiliation[0].name)) {
                confidence = .80
              }
            }
            
            // if paper undefined it is not inserted yet, and only insert if a name match within author set
            console.log(`item title ${ item.title[0] }, publication id: ${ JSON.stringify(authorMap.get(item.title[0])) })`)
            if (publicationId === undefined) { 
              const mutatePubResult = await client.mutate(
                insertPublication (item.title[0], item.DOI)
              )
              publicationId = 0+parseInt(`${ mutatePubResult.data.insert_publications.returning[0].id }`);
              console.log(`publication id found: ${ publicationId }`)
            
              var authorPosition = 0
              _.forEach(authorMap.get(item.title[0]).firstAuthors, async (firstAuthor) => {
                authorPosition += 1
                console.log(`publication id: ${ publicationId } inserting first author: ${ JSON.stringify(firstAuthor) }`)
                const mutateFirstAuthorResult = await client.mutate(
                  insertPubAuthor(publicationId, firstAuthor.given, firstAuthor.family, authorPosition)
                )
              })
              _.forEach(authorMap.get(item.title[0]).otherAuthors, async (otherAuthor) => {
                authorPosition += 1
                console.log(`publication id: ${ publicationId } inserting other author: ${ JSON.stringify(otherAuthor) }`)
                const mutateOtherAuthorResult = await client.mutate(
                  insertPubAuthor(publicationId, otherAuthor.given, otherAuthor.family, authorPosition)
                )
              })
            }
            
            // console.log(`2: publication id: ${ JSON.stringify(publicationId) }, ${ JSON.stringify(author.family) }`)
            // now insert a person publication record
            const mutateResult = await client.mutate(
              insertPersonPublication(person.id, publicationId, confidence)
            )
            console.log(`added person publication id: ${ mutateResult.data.insert_persons_publications.returning[0].id }`)
          }
        })
      }
    })
  })
}

main()