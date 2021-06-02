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
import updateMemberDates from './gql/updateMemberDates'
import updateMemberStartDate from './gql/updateMemberStartDate'

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
  cache: new InMemoryCache(),
  defaultOptions: {
    query: {
      fetchPolicy: 'network-only',
    },
  },
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

  console.log(`Returning existing list of institutions: ${JSON.stringify(existingInst, null ,2)}`)
  return existingInst
}

async function insertNewAuthors(newAuthors){

  const newAuthorInstitutions = _.uniq(_.map(newAuthors, 'institution'))

  // get institution list for author inserts
  let currentInstitutions = await updateAndRetrieveInstitutions(newAuthorInstitutions)
  console.log(`Current institutions retrieved: ${JSON.stringify(currentInstitutions, null, 2)}`)
  const institutionNameIdMap = _.reduce(currentInstitutions, (obj, inst) => {
    if (inst.name && inst['id']) { obj[inst.name] = inst['id'] }
    return obj
  }, {})

  console.log(`Institution to id map: ${JSON.stringify(institutionNameIdMap, null, 2)}`)

  // now add authors
  const authorsWithIds = []
  _.each(newAuthors, (author) => {
    // console.log(`Working on insert author: ${JSON.stringify(author, null, 2)}`)
    // console.log(`Keys are: ${JSON.stringify(_.keys(author), null, 2)}`) 
    // find family name key index since seems to fail sometimes
    let familyNameIndex = -1
    _.each(_.keys(author), (key, index) => {
      // console.log(`Key is ${key}, index is: ${index}`)
      if (key.includes('family_name')) {
        // console.log(`Setting family index to: ${index}`)
        familyNameIndex = index
      }
    })   
    const obj = {
      family_name: (familyNameIndex >= 0 ? author[_.keys(author)[familyNameIndex]] : author['family_name']),
      given_name: author['given_name'],
      email: author['email'],
      position_title: author['position_title'],
      institution_id: institutionNameIdMap[author.institution],
      start_date: new Date(author.start_date),
      end_date: new Date(`12/31/${author.end_date}`)
    }
    authorsWithIds.push(obj)
  })
  console.log(`New Authors translated for insert: ${JSON.stringify(authorsWithIds, null, 2)}`)

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
  console.log(`Finished inserting total new authors: ${resultInsertAuthors.data.insert_persons.returning.length}`)
  return resultInsertAuthors.data.insert_persons.returning
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
  return resultInsertMembers.data.insert_persons_organizations.returning
}

// expects a map of current center member DB ids to object with new attributes
async function updateCenterMembers(updateMembers){

}

async function main (): Promise<void> {

  // get confirmed author lists to papers
  const loadCenterMemberPaths = await getIngestFilePaths("../config/centerMemberFilePaths.json")

  await pMap(_.keys(loadCenterMemberPaths), async (center) => {
    await pMap(loadCenterMemberPaths[center], async (filePath: string) => {
      const loadCenterMembers: any = await loadCsv({
        path: filePath
      })

      // console.log(`Load Center member objects for center '${center}': ${JSON.stringify(loadCenterMembers, null, 2)}`)
  
      // check for existing authors
      let authorsExisting = await getAllSimplifiedPersons(client)

      //group the authors by lastname and firstname
      let authorsByName = _.mapKeys(authorsExisting, (author) => {
        return getNameKey(author['lastName'], author['firstName'])
      })

      // console.log(`Authors by name: ${_.keys(authorsByName)}`)
    
      // this is a map of name to array of members with that new author in case author is duplicated for more than one center in the load file
      const newAuthors = {}
      
      _.each(loadCenterMembers, (loadMember) => {
        let familyNameIndex = -1
        _.each(_.keys(loadMember), (key, index) => {
          // console.log(`Key is ${key}, index is: ${index}`)
          if (key.includes('family_name')) {
            // console.log(`Setting family index to: ${index}`)
            familyNameIndex = index
          }
        })   
        const authorKey = getNameKey(loadMember[_.keys(loadMember)[familyNameIndex]], loadMember['given_name'])
        if (!authorsByName[authorKey]){
          // use key to make sure no duplicates
          newAuthors[authorKey] = loadMember
        }
      })

      // console.log(`New Authors prepped for insert are: ${JSON.stringify(newAuthors, null, 2)}`)

      let insertedAuthors = undefined
      if (_.keys(newAuthors).length>0){
        insertedAuthors = await insertNewAuthors(_.values(newAuthors))
      }
      // just reload authors
      authorsExisting = await getAllSimplifiedPersons(client)
      //group the authors by lastname and firstname

      // console.log(`Authors by name before reload: ${_.keys(authorsByName).length}`)
      authorsByName = _.mapKeys(authorsExisting, (author) => {
        return getNameKey(author['lastName'], author['firstName'])
      })
      // console.log(`Authors by name after reload: ${_.keys(authorsByName).length}`)


      //// ---- Now insert member entries or update entries if start or end dates have changed ---- ////

      // sort into new members and existing member lists, grouped by center name
      const loadMembersByName = _.mapKeys(loadCenterMembers, (loadMember, index) => {
        let familyNameIndex = -1
        _.each(_.keys(loadMember), (key, index) => {
          // console.log(`Key is ${key}, index is: ${index}`)
          if (key.includes('family_name')) {
            // console.log(`Setting family index to: ${index}`)
            familyNameIndex = index
          }
        })   
        return  getNameKey(loadMember[_.keys(loadMember)[familyNameIndex]], loadMember['given_name'])
      })

      // get existing members in DB
      const existingCenterMembers = await getAllCenterMembers(client)

      // console.log(`Existing center members retrievied: ${JSON.stringify(existingCenterMembers, null, 2)}`)
      // group existing members by center by name
      const existingMembersByCenter = _.groupBy(existingCenterMembers, (member) => {
        return member.organizationValue
      })

      const existingMembersByNameByCenter = {}
      _.each(_.keys(existingMembersByCenter), (center) => {
        existingMembersByNameByCenter[center] = _.mapKeys(existingMembersByCenter[center], (member) => {
          return getNameKey(member['familyName'], member['givenName'])
        })
      })


      // sort name keys into new or updated lists by center
      const sortedMembers = _.groupBy(_.keys(loadMembersByName), (nameKey) => {
        if (existingMembersByNameByCenter[center] && existingMembersByNameByCenter[center][nameKey]){
          const newStartDate = `${loadMembersByName[nameKey]['start_date']}-01-01`
          const newEndDate = loadMembersByName[nameKey] && loadMembersByName[nameKey]['end_date'] ? `${loadMembersByName[nameKey]['end_date']}-12-31` : null
          if (newStartDate !== existingMembersByNameByCenter[center][nameKey]['startDate'] ||
            newEndDate !== existingMembersByNameByCenter[center][nameKey]['endDate']) {
            console.log(`Member ${nameKey} start date changed, will add to list to update, dates were: ${existingMembersByNameByCenter[center][nameKey]['startDate']}-${existingMembersByNameByCenter[center][nameKey]['endDate']} new dates:${newStartDate}-${newEndDate}`)
            return 'update'
          } else{
            // console.log(`No change to '${center}' member Author ${nameKey} found, will skip update`)
            return 'nochange'
          }
        } else {
          return 'new'
        }
      })

      console.log(`Sorted member ingest list new members: ${(sortedMembers['new'] ? sortedMembers['new'].length : 0)} of ${loadCenterMembers.length}`)
      console.log(`Sorted member ingest list no change needed members: ${(sortedMembers['nochange'] ? sortedMembers['nochange'].length : 0)} of ${loadCenterMembers.length}`)
      console.log(`Sorted member ingest list update members: ${(sortedMembers['update'] ? sortedMembers['update'].length : 0)} of ${loadCenterMembers.length}`)
      // console.log(`Authors by name is: ${JSON.stringify(authorsByName, null, 2)}`)

      // insert new members with existing persons linked
      const insertMembers = []
      // adding wider scope variable since not being pasted to nested scope
      // let currentCenter = center
      _.each(sortedMembers['new'], (nameKey: string) => {
        // console.log(`Authors by name keys are: ${JSON.stringify(_.keys(authorsByName), null, 2)}`)
        console.log(`Creating insert member for center ${center} and ${nameKey}`)
        let insertMember = {
          person_id: authorsByName[nameKey].id,
          organization_value: center
        }
        if (loadMembersByName[nameKey]['start_date']) {
          insertMember['start_date'] = new Date(loadMembersByName[nameKey]['start_date'])
        }

        if (loadMembersByName[nameKey]['end_date']) {
          insertMember['end_date'] = new Date(`${loadMembersByName[nameKey]['end_date']}-12-31`)
        }

        insertMembers.push(insertMember)
      })

      // insert the new members
      // console.log(`Prepped for Inserted Center Members are: ${JSON.stringify(insertMembers, null, 2)}`)
      const result = await insertNewCenterMembers(insertMembers)
      
      console.log(`Existing Center ${center} Members total: ${loadCenterMembers.length - insertMembers.length} of ${loadCenterMembers.length}`)
      console.log(`Inserted Center ${center} Members total: ${(result ? result.length: 0)} of ${insertMembers.length}`)
      console.log(`Center ${center} Existing Authors ${loadCenterMembers.length - _.keys(newAuthors).length} of ${loadCenterMembers.length} found`)
      console.log(`Center ${center} New Authors inserted total: ${(insertedAuthors ? insertedAuthors.length : 0)} of ${_.keys(newAuthors).length}`)

      // update members as needed
      const updateMembers = {}
      _.each(sortedMembers['update'], (nameKey: string) => {
        updateMembers[existingMembersByNameByCenter[center][nameKey]['id']] = loadMembersByName[nameKey]
      })

      // console.log(`Update members prepped are: ${JSON.stringify(updateMembers, null, 2)}`)
      
      // update existing members if dates changed
      let updatedCount = 0
      await pMap(_.keys(updateMembers), async (id) => {
        const newStartDate = `${updateMembers[id]['start_date']}-01-01`
        const newEndDate = updateMembers[id]['end_date'] ? `${updateMembers[id]['end_date']}-12-31` : undefined
        if (newEndDate) {
          const resultUpdateMemberDates = await client.mutate(updateMemberDates(Number.parseInt(`${id}`), new Date(newStartDate), new Date(newEndDate)))
          updatedCount += resultUpdateMemberDates.data.update_persons_organizations.returning.length
        } else {
          console.log(`Updating member with id: ${id}, with start date: ${newStartDate}`)
          const resultUpdateMemberDates = await client.mutate(updateMemberStartDate(Number.parseInt(`${id}`), new Date(newStartDate)))
          updatedCount += resultUpdateMemberDates.data.update_persons_organizations.returning.length
        }
      }, { concurrency: 1 })
      console.log(`Center ${center} Updated Members total: ${updatedCount} of ${_.keys(updateMembers).length}`)
    }, {concurrency: 1})
  }, {concurrency: 1})

}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
