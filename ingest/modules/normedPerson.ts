import _ from 'lodash'
import DateHelper from '../units/dateHelper'
import { command as loadCsv } from '../units/loadCsv'
import ApolloClient from 'apollo-client'
import { NormalizedCacheObject } from 'apollo-cache-inmemory'
import readPersons from '../gql/readPersons'
import readPersonsByYearAllCenters from '../gql/readPersonsByYearAllCenters'
import readCenterMembers from '../gql/readCenterMembers'
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
    semanticScholarIds?: [],
    googleScholarId?: []
  }
}
export default class NormedPerson {
  // ------ begin declare properties used when using NormedPerson like an interface
  id: number
  familyName: string
  givenNameInitial: string
  givenName: string
  startDate: Date
  endDate: Date
  nameVariances?: any[]
  names?: any[] // includes main name and name variances in one array
  sourceIds: {
    scopusAffiliationId?: string,
    semanticScholarIds?: string[],
    googleScholarId?: string[]
  }
  // ------ end declare properties used when using NormedPerson like an interface

  /**
   * @param csvPath the path to a CSV that contains the flat
   * non-normalized person records
   *
   * @returns an array of normalized people (e.g. NormedPerson)
   */
  public static async loadFromCSV (csvPath: string): Promise<NormedPerson[]> {
    console.log(`Loading People from path: ${csvPath}`)
    try {
      const peopleFromCsv: any = await loadCsv({
        path: csvPath,
        lowerCaseColumns: true
      })

      return _.map(peopleFromCsv, (personRow) => {
        return NormedPerson.getNormedPersonObjectFromCSVRow(personRow)
      })
    } catch (error) {
      console.log(`Error on paper load for path ${csvPath}, error: ${error}`)
      throw error
    }
  }

  /**
   * This function normalizes the given `personRow` into a NormedPerson
   *
   * @param personRow a single row, in a key/value pair form
   *
   * @return NormedPerson
   **/
  public static getNormedPersonObjectFromCSVRow(personRow): NormedPerson {
    const dateHelper = DateHelper.createDateHelper()
    const givenName = personRow['given_name']
    let person: NormedPerson = {
      id: personRow['id'] ? Number.parseInt(personRow['id']) : undefined,
      familyName: personRow['family_name'],
      givenNameInitial: personRow['given_name_initial'] ? personRow['given_name_initial'] : (givenName) ? givenName.charAt(0) : undefined,
      givenName: givenName,
      startDate: dateHelper.getDateObject(personRow['start_date']),
      endDate: dateHelper.getDateObject(personRow['end_date']),
      sourceIds: {
        scopusAffiliationId: personRow['scopus_affiliation_id']
      }
    }
    return person
  }
  
  public static mapToNormedPersons(people: Array<any>) : Array<NormedPerson> {
    const dateHelper = DateHelper.createDateHelper()
    const normedPersons = _.map(people, (person) => {
      const names = []
      names.push({
        familyName: _.trim(person.family_name.toLowerCase()),
        givenNameInitial: _.trim(person.given_name)[0].toLowerCase(),
        givenName: _.trim(person.given_name.toLowerCase()),
      })
      // add all name variations
      if (person.persons_namevariances) {
        _.each (person.persons_namevariances, (nameVariance) => {
          names.push({
            familyName: nameVariance.family_name.toLowerCase(),
            givenNameInitial: (nameVariance.given_name ? nameVariance.given_name[0].toLowerCase() : ''),
            givenName: (nameVariance.given_name ? nameVariance.given_name.toLowerCase() : '')
          })
        })
      }
      let np: NormedPerson = {
        id: person.id,
        familyName: _.toLower(person.family_name),
        givenNameInitial: _.toLower(person.given_name[0]),
        givenName: _.toLower(person.given_name),
        startDate: dateHelper.getDateObject(person.start_date),
        endDate: dateHelper.getDateObject(person.end_date),
        names: names,
        nameVariances: person.persons_namevariances,
        sourceIds: { semanticScholarIds: JSON.parse(person.semantic_scholar_ids),
                    googleScholarId: (person.google_scholar_id ? JSON.parse(person.google_scholar_id) : '')
        }
      }
      return np
    })
    return normedPersons
  }
  
  public static mapToSimplifiedPeople(people: Array<any>) : Array<SimplifiedPerson> {
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
  
  public static mapToCenterMembers(members: Array<any>) : NormedCenterMember[] {
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
        sourceIds: { semanticScholarIds: member.person.semantic_scholar_ids,
                    googleScholarId: member.person.google_scholar_id
        }
      }
      normedMembers.push(normedMember)
    })
    return normedMembers
  }
  
  public static getNameKey (lastName: string, firstName: string) : string {
    return `${_.trim(_.toLower(lastName))}, ${_.trim(_.toLower(firstName))}`
  }
  
  public static async getAllSimplifiedPersons (client: ApolloClient<NormalizedCacheObject>) : Promise<Array<SimplifiedPerson>> {
    const queryResult = await client.query(readPersons())
    return NormedPerson.mapToSimplifiedPeople(queryResult.data.persons)
  }
  
  public static async getSimplifiedPersonsByYear(year: number, client: ApolloClient<NormalizedCacheObject>) : Promise<Array<SimplifiedPerson>> {
    const queryResult = await client.query(readPersonsByYearAllCenters(year))
    return NormedPerson.mapToSimplifiedPeople(queryResult.data.persons)
  }
  
  public static async getAllCenterMembers(client: ApolloClient<NormalizedCacheObject>) : Promise<Array<NormedCenterMember>> {
    const queryResult = await client.query(readCenterMembers())
    return NormedPerson.mapToCenterMembers(queryResult.data.persons_organizations)
  }
  
  public static async getAllNormedPersonsByYear (year: number, client: ApolloClient<NormalizedCacheObject>) : Promise<Array<NormedPerson>> {
    const queryResult = await client.query(readPersonsByYearAllCenters(year))
    return NormedPerson.mapToNormedPersons(queryResult.data.persons)
  }
  
  public static async getAllNormedPersons (client: ApolloClient<NormalizedCacheObject>) : Promise<Array<NormedPerson>> {
    const queryResult = await client.query(readPersons())
    return NormedPerson.mapToNormedPersons(queryResult.data.persons)
  }
}