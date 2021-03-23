import NormedPublication from './normedPublication'

export default interface HarvestSet {
    sourceName: string,
    searchPerson?: NormedPerson,
    sourcePublications: any[],
    sessionState?: {},
    normedPublications?: NormedPublication[]
    errors?: any[],
    query?: string,
    offset?: Number,
    pageSize?: Number,
    totalResults: Number
}