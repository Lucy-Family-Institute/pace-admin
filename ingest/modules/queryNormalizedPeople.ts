import readPersons from '../../client/src/gql/readPersons'
import readPersonsByYear from '../../client/src/gql/readPersonsByYear'
import _ from 'lodash'
import { ApolloClient } from 'apollo-client'
import { NormalizedCacheObject } from 'apollo-cache-inmemory'
// This set of functions provide common methods for retrieving a
// SimplifiedPerson.

// @todo compare to normedPerson.ts; note this has startYear, endYear
// and normedPerson.ts has startDate and endDate
interface SimplifiedPerson {
  id: number;
  lastName: string;
  firstInitial: string;
  firstName: string;
  startYear: string;
  endYear: string;
  nameVariances: {};
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

export function getNameKey (lastName: string, firstName: string) : string {
  return `${_.toLower(lastName)}, ${_.toLower(firstName)}`
}

export async function getAllSimplifiedPersons (client: ApolloClient<NormalizedCacheObject>) : Promise<Array<SimplifiedPerson>> {
  const queryResult = await client.query(readPersons())
  return mapToSimplifiedPeople(queryResult.data.persons)
}

export async function getSimplifiedPersonsByYear(year: number, client: ApolloClient<NormalizedCacheObject>) : Promise<Array<SimplifiedPerson>> {
  const queryResult = await client.query(readPersonsByYear(year))
  return mapToSimplifiedPeople(queryResult.data.persons)
}