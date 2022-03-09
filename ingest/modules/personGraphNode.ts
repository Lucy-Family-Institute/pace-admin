import _ from "lodash";
import PublicationSet from "./publicationSet";
import PublicationSetGraphNode from "./publicationSetGraphNode";
import ReviewQueueGraphNode from "./reviewQueueGraphNode";

export default class PersonGraphNode {
  personId: number
  reviewQueueNodes: Map<string,ReviewQueueGraphNode>

  // pass in the review type list of strings
  constructor(personId, reviewTypes: string[]) {
    this.personId = personId
    // console.log(`Creating review queue nodes with reviewTypes: ${JSON.stringify(reviewTypes, null, 2)}`)
    this.reviewQueueNodes = this.createReviewQueueNodes(personId, reviewTypes)
  }

  createReviewQueueNodes(personId, reviewTypes: string[]): Map<string, ReviewQueueGraphNode> {
    let nodes: Map<string, ReviewQueueGraphNode> = new Map<string, ReviewQueueGraphNode>()
    _.each(reviewTypes, (reviewType) => {
      nodes[reviewType] = new ReviewQueueGraphNode(reviewType, personId)
    })
    return nodes
  }

  getReviewQueueNode(reviewType: string): ReviewQueueGraphNode {
    // console.log(`Getting review queue node reviewtype: ${reviewType}, node is: ${JSON.stringify(this.reviewQueueNodes[reviewType], null, 2)}`)
    return this.reviewQueueNodes[reviewType]
  }

  addPublicationSet(publicationSet: PublicationSet) {
    // console.log(`Adding publicationset to reviewQueues: '${JSON.stringify(_.keys(this.reviewQueueNodes))}' set: ${JSON.stringify(publicationSet, null, 2)}`)
    this.reviewQueueNodes[publicationSet.reviewType].addPublicationSet(publicationSet)
  }

  updatePublicationSetStatus(publicationSet: PublicationSet, newStatus) {
    const removed = this.reviewQueueNodes[publicationSet.reviewType].removePublicationSet(publicationSet)
    if (!removed) {
      throw(`Review type mismatch on update, expected publicationSet: ${publicationSet.mainPersonPub.publication.title} prev status: ${publicationSet.reviewType}, not found`)
    }
    publicationSet.reviewType = newStatus
    this.reviewQueueNodes[newStatus].addPublicationSet(publicationSet)
  }

  removePublicationSet(publicationSet: PublicationSet) {
    this.reviewQueueNodes[publicationSet.reviewType].removePublicationSet(publicationSet)
  }
}