import readPersons from '../../client/src/gql/readPersons'
import readPersonsByYearAllCenters from '../../client/src/gql/readPersonsByYearAllCenters'
import readCenterMembers from '../../client/src/gql/readCenterMembers'
import _ from 'lodash'
import { ApolloClient } from 'apollo-client'
import { NormalizedCacheObject } from 'apollo-cache-inmemory'
import NormedPerson from '../modules/normedPerson'
import { getDateObject } from '../units/dateRange'
// This set of functions provide common methods for retrieving a
// SimplifiedPerson.

// @todo compare to normedPerson.ts; note this has startYear, endYear
// and normedPerson.ts has startDate and endDate
export interface SimplifiedPerson {
  id: number;
  lastName: string;
  firstInitial: string;
  firstName: string;
  startYear: string;
  endYear: string;
  nameVariances: {};
}

interface NormedCenterMember {
  id: Number,
  personId: Number,
  familyName: string
  givenNameInitial: string
  givenName: string
  organizationValue: string,
  startDate: Date
  endDate: Date
  sourceIds: {
    scopusAffiliationId?: string,
    semanticScholarIds?: []
  }
}

function mapToNormedPersons(people: Array<any>) : Array<NormedPerson> {
  const normedPersons = _.map(people, (person) => {
    let np: NormedPerson = {
      id: person.id,
      familyName: _.toLower(person.family_name),
      givenNameInitial: _.toLower(person.given_name[0]),
      givenName: _.toLower(person.given_name),
      startDate: getDateObject(person.start_date),
      endDate: getDateObject(person.end_date),
      nameVariances: person.persons_namevariances,
      sourceIds: { semanticScholarIds: JSON.parse(person.semantic_scholar_ids) }
    }
    return np
  })
  return normedPersons
}

function mapToSimplifiedPeople(people: Array<any>) : Array<SimplifiedPerson> {
  const simplifiedPersons = _.map(people, (person) => {
    let sp: SimplifiedPerson = {
      id: person.id,
      lastName: _.toLower(person.family_name),
      firstInitial: _.toLower(person.given_name[0]),
      firstName: _.toLower(person.given_name),
      startYear: person.start_date,
      endYear: person.end_date,
      nameVariances: person.persons_namevariances
    }
    return sp
  })
  return simplifiedPersons
}

function mapToCenterMembers(members: Array<any>) : NormedCenterMember[] {
  let normedMembers: NormedCenterMember[] = []
  _.each(members, (member) => {
    const normedMember: NormedCenterMember = {
      id: member.id,
      personId: member.person_id,
      organizationValue: member.organization_value,
      familyName: _.toLower(member.person.family_name),
      givenName: _.toLower(member.person.given_name),
      givenNameInitial: _.toLower(member.person.given_name[0]),
      startDate: member.start_date,
      endDate: member.end_date,
      sourceIds: { semanticScholarIds: member.person.semantic_scholar_ids }
    }
    normedMembers.push(normedMember)
  })
  return normedMembers
}

export function getNameKey (lastName: string, firstName: string) : string {
  return `${_.trim(_.toLower(lastName))}, ${_.trim(_.toLower(firstName))}`
}

export async function getAllSimplifiedPersons (client: ApolloClient<NormalizedCacheObject>) : Promise<Array<SimplifiedPerson>> {
  const queryResult = await client.query(readPersons())
  return mapToSimplifiedPeople(queryResult.data.persons)
}

export async function getSimplifiedPersonsByYear(year: number, client: ApolloClient<NormalizedCacheObject>) : Promise<Array<SimplifiedPerson>> {
  const queryResult = await client.query(readPersonsByYearAllCenters(year))
  return mapToSimplifiedPeople(queryResult.data.persons)
}

export async function getAllCenterMembers(client: ApolloClient<NormalizedCacheObject>) : Promise<Array<NormedCenterMember>> {
  const queryResult = await client.query(readCenterMembers())
  return mapToCenterMembers(queryResult.data.persons_organizations)
}

export async function getAllNormedPersonsByYear (year: number, client: ApolloClient<NormalizedCacheObject>) : Promise<Array<NormedPerson>> {
  const queryResult = await client.query(readPersonsByYearAllCenters(year))
  return mapToNormedPersons(queryResult.data.persons)
}