interface HarvestSet {
    sourceName: string,
    searchPerson?: NormedPerson,
    publications: any[],
    query?: string,
    offset?: Number,
    pageSize?: Number,
    totalResults: Number
}