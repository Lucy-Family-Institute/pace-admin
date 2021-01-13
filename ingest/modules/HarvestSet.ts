interface HarvestSet {
    sourceName: string,
    searchPerson?: NormedPerson,
    sourcePublications: any[],
    normedPublications?: NormedPublication[]
    errors?: any[],
    query?: string,
    offset?: Number,
    pageSize?: Number,
    totalResults: Number
}