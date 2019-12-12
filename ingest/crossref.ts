import axios from 'axios'
import _ from 'lodash'
import { ApolloClient, MutationOptions } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import pEachSeries from 'p-each-series'
import readUsers from '../client/src/gql/readPersons'
import insertPaper from './gql/insertPaper'

const client = new ApolloClient({
  link: createHttpLink({
    uri: 'http://localhost:8002/v1/graphql',
    headers: {
      'x-hasura-admin-secret': 'mysecret'
    },
    fetch: fetch as any
  }),
  cache: new InMemoryCache()
})

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
      headers: {
        'User-Agent': 'GroovyBib/1.1 (https://example.org/GroovyBib/; mailto:GroovyBib@example.org) BasedOnFunkyLib/1.4'
      }
    })
    _.map(result.data.message.items, (item) => {
      if(item.type === 'journal-article') {
        _.each(item.author, async (author) => {
          if(_.lowerCase(author.family) === person.lastName && 
            _.startsWith(_.lowerCase(author.given), person.firstInitial)
          ) {
            let confidence = .50
            if(!_.isEmpty(author.affiliation)) {
              if(/notre dame/gi.test(author.affiliation[0].name)) {
                confidence = .80
              }
            }
            const mutateResult = await client.mutate(
              insertPaper(person.id, item.title[0], item.DOI, confidence)
            )
            console.log('added!')
          }
        })
      }
    })
  })
}

main()