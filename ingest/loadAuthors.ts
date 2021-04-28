import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import gql from 'graphql-tag'
import fetch from 'node-fetch'
import _ from 'lodash'
import { command as loadCsv } from './units/loadCsv'
import { getAllSimplifiedPersons, getAllCenterMembers, getNameKey } from './modules/queryNormalizedPeople'
import readInstitutions from './gql/readInstitutions'
import updatePersonDates from './gql/updatePersonDates'


import dotenv from 'dotenv'
import pMap from 'p-map'

const getIngestFilePaths = require('./getIngestFilePaths');

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

/**
 * Gets a list of institution objects in the database
 * 
 * If the optional parameter insertInstitutionsIfNeeded is supplied it will insert any institutions that
 * are not yet present in the database
 * 
 * @returns a map of institution name to object returned by DB
 * 
 */
async function updateAndRetrieveInstitutions(insertInstitutionsIfNeeded?: any[]) {
  // check for existing institutions
  const result = await client.query(readInstitutions())
  let existingInst = result.data.institutions

  let instByName = _.groupBy(existingInst, (inst) => {
    return inst['name']
  })

  if (insertInstitutionsIfNeeded) {
    const insertInst = []
    const uniqInst = _.uniq(insertInstitutionsIfNeeded)
    _.each(uniqInst, (inst) => {
      if (!instByName[inst]){
        insertInst.push(inst)
      }
    })

    if (insertInst.length > 0){
      const result = await client.mutate({
        mutation: gql`
          mutation InsertInstitutionMutation ($institutions:[institutions_insert_input!]!){
            insert_institutions(
              objects: $institutions
              on_conflict: {constraint: institutions_pkey, update_columns: name}
            ) {
              returning {
                id
                name
              }
            }
          }`,
        variables: {
          institutions: _.map(insertInst, (i: string) => ({ name: i }))
        }
      })
  
      // get indexed id's for institutions, and update author list with id's for inserts
      const insertedInstitutions = result.data.insert_institutions.returning || []
      existingInst = _.concat(existingInst, insertedInstitutions)
    }
  }

  return existingInst
}

async function insertNewAuthors(newAuthors){

  const newAuthorInstitutions = _.uniq(_.map(newAuthors, 'institution'))

  // get institution list for author inserts
  let currentInstitutions = updateAndRetrieveInstitutions(newAuthorInstitutions)
  const institutionNameIdMap = _.reduce(currentInstitutions, (obj, inst) => {
    if (inst.name && inst['id']) { obj[inst.name] = inst['id'] }
    return obj
  }, {})

  console.log(`Institution to id map: ${JSON.stringify(institutionNameIdMap, null, 2)}`)

  // now add authors
  const authorsWithIds = _.map(newAuthors, (author) => {
    console.log(`Working on insert author: ${JSON.stringify(author, null, 2)}`)
    const obj = _.pick(author, ['family_name', 'given_name', 'email', 'position_title'])
    if (institutionNameIdMap[author.institution]) {
      // eslint-disable-next-line 
      obj["institution_id"] = institutionNameIdMap[author.institution]
    }
    if (author.start_date) {
      // eslint-disable-next-line 
      obj["start_date"] = new Date(author.start_date)
    }
    if (author.end_date) {
      // eslint-disable-next-line 
      obj["end_date"] = new Date(`12/31/${author.end_date}`)
    }
    return obj
  })
  console.log(`New Authors translated for insert: ${authorsWithIds[0]}`)

  const resultInsertAuthors = await client.mutate({
    mutation: gql`
      mutation InsertPersonMutation ($persons:[persons_insert_input!]!){
        insert_persons(
          objects: $persons
        ) {
          returning {
            id,
            given_name,
            family_name,
            email,
            position_title,
            start_date,
            end_date,
            institution {
              name
            }
          }
        }
      }`,
    variables: {
      persons: authorsWithIds
    }
  })

  return resultInsertAuthors.data.returning
}

async function insertNewCenterMembers(newMembers){
   const resultInsertMembers = await client.mutate({
    mutation: gql`
      mutation InsertPersonsOrganizationsMutation ($persons_organizations:[persons_organizations_insert_input!]!){
        insert_persons_organizations(
          objects: $persons_organizations
        ) {
          returning {
            id,
            person_id,
            organization_value
            start_date,
            end_date
          }
        }
      }`,
    variables: {
      persons_organizations: newMembers
    }
  })
  return resultInsertMembers.data.returning
}

// expects a map of current center member DB ids to object with new attributes
async function updateCenterMembers(updateMembers){

}

async function main (): Promise<void> {

  // get confirmed author lists to papers
  const loadCenterMemberPaths = await getIngestFilePaths("../config/centerMemberFilePaths.json")

  await pMap(_.keys(loadCenterMemberPaths), async (center) => {
    await pMap(loadCenterMemberPaths[center], async (filePath) => {
      const loadCenterMembers: any = await loadCsv({
        path: filePath
      })

      console.log(`Load Center member objects for center '${center}': ${JSON.stringify(loadCenterMembers, null, 2)}`)
  
      // check for existing authors
      let authorsExisting = await getAllSimplifiedPersons(client)

      //group the authors by lastname and firstname
      let authorsByName = _.mapKeys(authorsExisting, (author) => {
        return getNameKey(author['lastName'], author['firstName'])
      })

      console.log(`Authors by name: ${_.keys(authorsByName)}`)
    
      // this is a map of name to array of members with that new author in case author is duplicated for more than one center in the load file
      const newAuthors = {}
      
      _.each(loadCenterMembers, (loadMember) => {
        const authorKey = getNameKey(loadMember['family_name'], loadMember['given_name'])
        if (!authorsByName[authorKey]){
          // use key to make sure no duplicates
          newAuthors[authorKey] = loadMember
        }
      })

      console.log(`New Authors prepped for insert are: ${JSON.stringify(newAuthors, null, 2)}`)

      if (_.keys(newAuthors).length>0){
        const insertedAuthors = await insertNewAuthors(_.values(newAuthors))
      }
      // just reload authors
      authorsExisting = await getAllSimplifiedPersons(client)
      //group the authors by lastname and firstname
      authorsByName = _.mapKeys(authorsExisting, (author) => {
        return getNameKey(author['lastName'], author['firstName'])
      })

      //// ---- Now insert member entries or update entries if start or end dates have changed ---- ////

      // sort into new members and existing member lists, grouped by center name
      // map name keys to member objects and then group by center

      const loadMembersByCenter = _.groupBy(loadCenterMembers, (member) => {
        return member['center']
      })

      let loadMembersByNameByCenter = {}
      _.each(_.keys(loadMembersByCenter), (center) => {
        loadMembersByNameByCenter[center] = _.mapKeys(loadMembersByCenter[center], (loadMember) => {
          return getNameKey(loadMember['family_name'], loadMember['given_name'])
        })
      })

      // get existing members in DB
      const existingCenterMembers = await getAllCenterMembers(client)
      // group existing members by center by name
      const existingMembersByCenter = _.groupBy(existingCenterMembers, (member) => {
        return member.organizationValue
      })

      let existingMembersByNameByCenter = {}
      _.each(_.keys(existingMembersByCenter), (center) => {
        existingMembersByNameByCenter[center] = _.mapKeys(existingMembersByCenter[center], (member) => {
          return getNameKey(member['familyName'], member['givenName'])
        })
      })


      // sort name keys into new or updated lists by center
      const sortedMemberNamesByCenter = {}
      _.each(_.keys(loadMembersByNameByCenter), (center) => {
        sortedMemberNamesByCenter[center] = _.groupBy(_.keys(loadMembersByNameByCenter[center]), (nameKey) => {
          if (existingMembersByNameByCenter[center] && existingMembersByNameByCenter[center][nameKey]){
            return 'update'
          } else {
            return 'new'
          }
        })
      })

      console.log(`Sorted member ingest list: ${JSON.stringify(sortedMemberNamesByCenter, null, 2)}`)

      // insert new members with existing persons linked
      const insertMembers = []
      _.each(sortedMemberNamesByCenter, (center: string) => {
        _.each(sortedMemberNamesByCenter['new'], (nameKey: string) => {
          let insertMember = {
            person_id: authorsByName[nameKey].id,
            organization_value: center
          }
          if (loadMembersByNameByCenter[center][nameKey]['start_date']) {
            insertMember['start_date'] = new Date(loadMembersByNameByCenter[center][nameKey]['start_date'])
          }

          if (loadMembersByNameByCenter[center][nameKey]['end_date']) {
            insertMember['end_date'] = new Date(loadMembersByNameByCenter[center][nameKey]['end_date'])
          }

          insertMembers.push(insertMember)
        })
      })

      // insert the new members
      const result = await insertNewCenterMembers(insertMembers)
      console.log(`Inserted Center Members are: ${JSON.stringify(result, null, 2)}`)

      // update members as needed
      const updateMembers = []
      _.each(sortedMemberNamesByCenter, (center: string) => {
        _.each(sortedMemberNamesByCenter['update'], (nameKey: string) => {
          const newStartDate = `${loadMembersByNameByCenter[center][nameKey]['start_date']}-01-01`
          const newEndDate = loadMembersByNameByCenter[center][nameKey] ? `${loadMembersByNameByCenter[center][nameKey]}-12-31` : null
          if (newStartDate !== existingMembersByNameByCenter[center][nameKey]['start_date'] ||
          newEndDate !== existingMembersByNameByCenter[center][nameKey]['end_date']) {
            console.log(`Member${nameKey} start date changed, will add to list to update, dates were: ${new Date(`${existingMembersByNameByCenter[center][nameKey]['start_date']}`)}-${existingMembersByNameByCenter[center][nameKey]['end_date']} new dates:${newStartDate}-${newEndDate}`)
            console.log(`Existing member keys are ${_.keys(existingMembersByNameByCenter[center][nameKey])}`)
            updateMembers[existingMembersByNameByCenter[center][nameKey]['id']] = loadMembersByNameByCenter[center][nameKey]
          } else{
            console.log(`No change to '${center}' member Author ${nameKey} found, will skip update`)
          }
        })
      })

      // update existing members if dates changed
  

      // // update existing authors as needed
      // console.log(`Update Authors: ${_.keys(updateAuthors).length}`)
      // // need to add update gql
      // _.each(_.keys(updateAuthors), async (id) => {
      //   const newStartDate = `${updateAuthors[id].start_date}-01-01`
      //   const newEndDate = updateAuthors[id].end_date ? `${updateAuthors[id].end_date}-12-31` : undefined
      //   const resultUpdatePersonDates = await client.mutate(updatePersonDates(id, new Date(newStartDate), new Date(newEndDate)))
      // })
    }, {concurrency: 1})
  }, {concurrency: 1})

}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
