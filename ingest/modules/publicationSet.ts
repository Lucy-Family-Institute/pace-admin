import NormedPersonPublication from './normedPersonPublication'

export default interface PublicationSet {
    id: number,
    personPublicationIds: Number[],
    personPublications: NormedPersonPublication[],
    mainPersonPubId: Number,
    mainPersonPub: NormedPersonPublication,
    reviewType: string
}