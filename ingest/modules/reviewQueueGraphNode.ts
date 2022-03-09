import PublicationSet from "./publicationSet"
import PublicationSetGraphNode from "./publicationSetGraphNode"
import _ from 'lodash'

export default class ReviewQueueGraphNode {
  reviewType: string
  personId: number
  private publicationSetGraphNodes: Map<number,PublicationSetGraphNode>

  constructor(reviewType: string, personId: number) {
    this.reviewType = reviewType
    this.personId = personId
    this.publicationSetGraphNodes = new Map<number,PublicationSetGraphNode>()
  }

  getPublicationSetIds(): string[]{
    return _.keys(this.publicationSetGraphNodes)
  }

  addPublicationSet(pubSet: PublicationSet) {
    // only add if not already in tree
    if (!this.publicationSetGraphNodes[pubSet.id]) {
      // console.log(`Adding publication set graph node to review queue: ${this.reviewType}, person: ${this.personId}, pubsetid: ${pubSet.id}`)
      this.publicationSetGraphNodes[pubSet.id] = new PublicationSetGraphNode(this.reviewType, pubSet.id)
    }
  }

  // for a review queue status change remove it from this queue
  // returns true if removed, false if it did not exist
  removePublicationSet(pubSet: PublicationSet): boolean {
    return this.publicationSetGraphNodes.delete(pubSet.id)
  }
}