interface NormedPerson {
    id: Number,
    familyName: string,
    givenNameInitial: string,
    givenName: string,
    startDate: Date,
    endDate: Date,
    sourceIds: {
        scopusAffiliationId?: string
    }
}