
export default class PublicationSetGraphNode {
  // its parent is a review type node in the person id's tree
  reviewType: string
  publicationSetId: number

  constructor(reviewType: string, publicationSetId: number) {
    this.reviewType = reviewType
    this.publicationSetId = publicationSetId
  }
}