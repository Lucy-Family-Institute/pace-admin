interface NormedPerson {
    id: Number,
    lastName: string,
    firstInitial: string,
    firstName: string,
    startDate: Date,
    endDate: Date,
    sourceIds: {
        scopusAffiliationId?: string
    }
}