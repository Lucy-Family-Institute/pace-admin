import NormedPerson from "./normedPerson"

export enum HarvestOperationType {
  QUERY_BY_AUTHOR_NAME,
  QUERY_BY_AUTHOR_ID
}

export interface HarvestOperation {
  harvestOperationType: HarvestOperationType,
  normedPersons: NormedPerson[],
  harvestResultsDir: string,
  startDate: Date,
  endDate: Date
}