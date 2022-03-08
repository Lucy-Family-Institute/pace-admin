import NormedPersonPublication from './normedPersonPublication'

export default interface PublicationSet {
    personPublicationIds: Number[],
    personPublications: NormedPersonPublication[],
    mainPersonPubId: Number,
    mainPersonPub: NormedPersonPublication,
    reviewType?: string
}