import _ from 'lodash'
import PublicationSet from './publicationSet'
import NormedPersonPublication from './normedPersonPublication'
import { relativeTimeThreshold } from 'moment'
import PersonGraphNode from './personGraphNode'
import PublicationSetGraphNode from './publicationSetGraphNode'
import ReviewQueueGraphNode from './reviewQueueGraphNode'

export default class PublicationGraph {

  // these are helper objects to connect personPubSets together
  // contains map of personPub id to pubset id
  private personPubSetPointer: {}
  // PersonPubSet Id -> Person Pub Id list (i.e., the set itself)
  // pointer to pubset object regardless of where it may be in the graph
  personPubSetsById: {}
  // the current index for personPubSets, will increment whenever adding a new one
  personPubSetIdIndex: number
  outputLogs: boolean
  // registry pointer to pubset objects by title key to detect others with same title and group together in pubSet graph
  personPubSetIdsByTitleKey: {}
  // registry pointer to pubset objects by doi key to detect others with same doi and group together in pubSet graph
  personPubSetIdsByDoiKey: {}

  // array of review types for this graph of publications
  reviewTypes: string[]
 
  // will contain graph of Person ids > person graph nodes -> 
  //                                    review queue nodes (e.g., accepted) -> 
  //                                    list of pubsets in this review queue -> 
  //                                    pubset -> 
  //                                    personPub(s) (personPubs from each metadata source for
  //                                                  same publication grouped by DOI and/or title)
  // this graph tree just contains id's that reference actual objects
  // to get actual objects need to first get list pubSet ids, person id, or personPub id(s)
  // from the graph, and then pull actual pubset objects from personPubSetsById hash
  private personNodeTree: Map<number,PersonGraphNode>
  
  constructor (reviewTypes: string[], outputLogs= false) {
    this.outputLogs = outputLogs
    this.personPubSetIdIndex = 0
    this.personPubSetPointer = {}
    this.personPubSetsById = {}
    this.personPubSetIdsByTitleKey = {}
    this.personPubSetIdsByDoiKey = {}
    this.reviewTypes = reviewTypes
    this.personNodeTree = new Map<number,PersonGraphNode>()
  }

  public static createPublicationGraph(reviewTypes: string[], outputLogs = false) {
    return new PublicationGraph(reviewTypes, outputLogs)
  }

  addToGraph (personPubs: NormedPersonPublication[]) {
    // group by title
    // group by doi
    // then insert each set into graph and combine parent set nodes as needed
    // seed the personPublication keys
    const personPublicationsKeys = {}
    _.each(personPubs, (personPub) => {
      this.addPersonPubToGraph(personPub)
    })
    if (this.outputLogs) {
      console.log(`Finished add to publication graph.`)
    }
  }

  addPersonPubToGraph(personPub: NormedPersonPublication) {
    // look to see if relevant pubset already exists, if so add to it
    const pubSets: PublicationSet[] = this.findPublicationSetForPersonPublication(personPub)
    if (pubSets.length > 0) {
      // link to all relevant pubsets found (if multiple they will get merged thru the process)
      _.each(pubSets, (pubSet) => {
        if (pubSet.personPublicationIds.length > 0) {
          this.linkPersonPubPair(personPub, pubSet.personPublications[0])
        }
      })    
    } else {
      // if no relevant pubset found, start a new one
      this.startPersonPubSet(personPub)
    }
  }

  updatePubSetReviewStatus(pubSetId: number, newStatus: string) {
    const pubSet = this.personPubSetsById[`${pubSetId}`]
    if (pubSet) {
      const personId = pubSet.mainPersonPub.person.id
      this.getPersonGraphNode(personId).updatePublicationSetStatus(pubSet, newStatus)
    }
  }

  private addPersonPubSetToGraph(pubSet: PublicationSet) {
    // console.log(`Adding pubset: ${JSON.stringify(pubSet, null, 2)}`)
    this.getPersonGraphNode(pubSet.mainPersonPub.person_id).addPublicationSet(pubSet)
  }

  // retrieves a person graph node by id, and creates one if it does not exist yet
  getPersonGraphNode(personId: number): PersonGraphNode {
    if (!this.personNodeTree[personId]) {
      // console.log(`Creating new person node with review Types: ${JSON.stringify(this.reviewTypes, null, 2)}`)
      let newNode = new PersonGraphNode(personId, this.reviewTypes)
      this.personNodeTree[personId] = newNode
      // console.log(`Person node hash is: ${JSON.stringify(this.personNodeTree, null, 2)}`)
      return newNode
    } else {
      return this.personNodeTree[personId]
    }
  }

  // will return empty set no relevant publication set exists yet
  // if multiple relevant sets exist, will need to link to all and merged sets will happen as a result
  private findPublicationSetForPersonPublication(personPub: NormedPersonPublication): PublicationSet[] {
    const titleKey = this.getPublicationTitleKey(personPub.title)
    const doiKey = this.getPublicationDoiKey(personPub.id, personPub.doi, personPub.sourceName, personPub.sourceId)
    let pubSets: PublicationSet[] = []
    if (titleKey && this.personPubSetIdsByTitleKey[titleKey]){
      const setId = this.personPubSetIdsByTitleKey[titleKey]
      pubSets.push(this.getPersonPubSet(setId))
    }
    if (doiKey && this.personPubSetIdsByDoiKey[doiKey]) {
      const setId = this.personPubSetIdsByDoiKey[doiKey]
      pubSets.push(this.getPersonPubSet(setId))
    } 
    return pubSets
  }

  getAllPublicationSets(): PublicationSet[] {
    return _.values(this.personPubSetsById)
  }

  getPersonPublicationSets(personId, reviewType): PublicationSet[] {
    // console.log(`Getting person graph node for person id: ${personId} and review: ${reviewType}`)
    // console.log(`person graph node is: ${JSON.stringify(this.getPersonGraphNode(personId))}`)
    const pubSetIds = this.getPersonGraphNode(personId).getReviewQueueNode(reviewType).getPublicationSetIds()
    let pubSets = []
    // console.log(`Pub set ids found for person id: ${personId}, review type: ${reviewType}, pubsetids: ${JSON.stringify(pubSetIds, null, 2)}`)
    _.each(pubSetIds, (pubSetId) => {
      const pubSet = this.getPersonPubSet(pubSetId)
      if (pubSet) pubSets.push(pubSet)
    })
    return pubSets
  }

  // if reviewType is passed in it will return a count only for that queue, otherwise it will return a total count
  getPersonPublicationSetsCount(personId, minConfidence: number, reviewType?: string) {
    if (reviewType) {
      return this.getReviewQueuePersonPublicationSetsCount(personId, minConfidence, reviewType)
    } else {
      let totalCount = 0
      const personNode = this.getPersonGraphNode(personId)
      _.each(_.keys(personNode.reviewQueueNodes), (curReviewType) => {
        totalCount = totalCount + this.getReviewQueuePersonPublicationSetsCount(personId, minConfidence, curReviewType)
      })
      return totalCount
    }
  }

  private getReviewQueuePersonPublicationSetsCount(personId, minConfidence: number, reviewType: string): number {
    // console.log(`Getting pub count for person id: ${personId}, minConfidence: ${minConfidence} reviewtype: ${reviewType}`)
    const pubSetIds = this.getPersonGraphNode(personId).getReviewQueueNode(reviewType).getPublicationSetIds()
    if (minConfidence <= 0) {
      // console.log(`Review queue node for person id: ${personId} reviewType: ${reviewType} node: ${JSON.stringify( this.getPersonGraphNode(personId).getReviewQueueNode(reviewType), null, 2)}`)
      // console.log(`Pub set ids for person id: ${personId}, reviewType: ${reviewType}, pubSetIds: ${JSON.stringify(pubSetIds, null, 2)}`)
      // console.log(`Found pub count for person id: ${personId}, minConfidence: ${minConfidence} reviewtype: ${reviewType}, count: ${pubSetIds.length}`)
      return (pubSetIds ? pubSetIds.length : 0)
    } else {
      let totalCount = 0
      _.each(pubSetIds, (pubSetId) => {
        const pubSet = this.getPersonPubSet(pubSetId)
        if (pubSet.mainPersonPub.confidence >= minConfidence) totalCount = totalCount + 1
      })
      // console.log(`Review queue node for person id: ${personId} reviewType: ${reviewType} node: ${JSON.stringify( this.getPersonGraphNode(personId).getReviewQueueNode(reviewType), null, 2)}`)
      // console.log(`Pub set ids for person id: ${personId}, reviewType: ${reviewType}, pubSetIds: ${JSON.stringify(pubSetIds, null, 2)}`)
      // console.log(`Found pub count for person id: ${personId}, minConfidence: ${minConfidence} reviewtype: ${reviewType}, count: ${totalCount}`)
      return totalCount
    }
  }

  private getPublicationTitleKey (title) {
    // normalize the string and remove characters like dashes as well
    return this.normalizeString(title, true, true)
  }

  private getPublicationDoiKey (personPubId, doi, sourceName, sourceId) {
    if (this.outputLogs) {
      console.log(`Generating doi key for publication id: ${personPubId} doi: ${doi}`)
    }
    let doiKey
    if (!doi || doi === null || this.removeSpaces(doi) === '') {
      if (sourceName && sourceId) {
        doiKey = `${sourceName}_${sourceId}`
      }
    } else {
      doiKey = doi
    }
    if (this.outputLogs) {
      console.log(`Generated doi key for personpublication id: ${personPubId} doi: ${doi} doi key: ${doiKey}`)
    }  
    return doiKey
  }

  private removeSpaces (value) {
    if (_.isString(value)) {
      return _.clone(value).replace(/\s/g, '')
    } else {
      return value
    }
  }
  // replace diacritics with alphabetic character equivalents
  private normalizeString (value, lowerCase, removeSpaces) {
    if (_.isString(value)) {
      let newValue = _.clone(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[\u2019]/g, '\u0027') // the u0027 also normalizes the curly apostrophe to the straight one
        .replace(/[&\\#,+()$~%.'":*?<>{}!-]/g, '') // remove periods and other remaining special characters
      if (lowerCase) {
        newValue = _.lowerCase(newValue)
      }
      if (removeSpaces) {
        return this.removeSpaces(newValue)
      } else {
        return newValue
      }
    } else {
      return value
    }
  }
  
  getPersonPubSet (setId: string): PublicationSet {
    return this.personPubSetsById[setId]
  }

  getPersonPubSetByPersonPubId ( personPublicationId: Number) : PublicationSet {
    return this.getPersonPubSet(this.getPersonPubSetId(`${personPublicationId}`))
  }

  // this method will link person pubs by putting them in a person pub set
  // together.  If neither are already in a person pub set, they will be grouped together in a new set
  // If only one has a set, the other will be added to that set
  // If both are currently within a set, it will merge the two sets together
  private linkPersonPubPair (personPub1: NormedPersonPublication, personPub2: NormedPersonPublication) {
    const notInPersonPub1SetId: boolean = this.notInPersonPubSet(personPub1.id)
    const notInPersonPub2SetId: boolean = this.notInPersonPubSet(personPub2.id)
    const personPubSet1Id: string = this.getPersonPubSetId(`${personPub1.id}`)
    const personPubSet2Id: string = this.getPersonPubSetId(`${personPub2.id}`)
    // console.log(`Linking person pub id 1: ${personPub1.id} to person pub id 2: ${personPub2.id}`)
    if (notInPersonPub1SetId && notInPersonPub2SetId) {
      // neither one is in a set yet and just add to set list
      // console.log(`Starting new set for personPubId1: ${personPub1.id}`)
      const newSetId: string = this.startPersonPubSet(personPub1)
      // console.log(`Created personPubset1: ${newSetId} and added person pub1: ${personPub1.id}`)
      // console.log(`Adding personPubId2: ${personPub2.id} to set1id: ${newSetId}`)
      this.addPersonPubToSet(newSetId, personPub2)
    } else if (notInPersonPub2SetId) {
      // console.log(`Adding personPubId2: ${personPub2.id} to set1id: ${personPubSet1Id}`)
      this.addPersonPubToSet(personPubSet1Id, personPub2)
    } else if (notInPersonPub1SetId) {
      // console.log(`Adding personPubId1: ${personPub1.id} to set2id: ${personPubSet2Id}`)
      this.addPersonPubToSet(personPubSet2Id, personPub1)
    } else {
      // they are both in existing sets and need to merge them
      // do nothing if they have the same pubsetid as they are already
      // in the same set
      // console.log(`Merging sets for personPubId1: ${personPub1.id} and personPubId2: ${personPub2.id}, set2Id->set1Id: (${personPubSet2Id}->${personPubSet1Id})`)
      this.mergePersonPubSets(personPubSet1Id, personPubSet2Id)
    }
  }

  private mergePersonPubSets (set1Id: string, set2Id: string) {
    // do nothing if they are the same set id
    // console.log(`Merging person pub sets set1: ${set1Id} set2: ${set2Id}`)
    if (set1Id !== set2Id) {
      // add items from set2 into set1 if not already there, assumes everything is up to date with pointers
      const set1: PublicationSet = this.getPersonPubSet(set1Id)
      const set2: PublicationSet = this.getPersonPubSet(set2Id)
      // if (set1.reviewType !== set2.reviewType) {
      //   const error = `Warning: Mismatch in reviewType for sets to be merged. found set 1: ${set1.reviewType} set 2: ${set2.reviewType}`
      //   console.log(error)
      // }
      const set2List: NormedPersonPublication[] = set2.personPublications
      _.each(set2List, (personPub: NormedPersonPublication) => {
        // will reset pointers as well
        this.addPersonPubToSet(set1Id, personPub)
      })
      // destroy the set2List
      this.removePersonPubSet(set2)
    }
  }

  private removePersonPubSet (pubSet: PublicationSet) {
    // only works if personPubs in this set already pointing to another one, else throw error
    // do nothing if set already gone
    if (pubSet) {
      _.each(pubSet.personPublications, (personPub) => {
        if (pubSet.id && this.getPersonPubSetId(`${personPub.id}`) === `${pubSet.id}`) {
          const error = `Cannot remove person Pub Set (on merge), personPubId: ${personPub.id} not in any other set`
          console.log(error)
          throw error
        }
      })
      // if we get this far no errors encountered, and all person pubs are now in another set
      // go ahead and delete it
      // remove from person graph node
      this.getPersonGraphNode(pubSet.mainPersonPub.person_id).removePublicationSet(pubSet)
      _.unset(this.personPubSetsById, `${pubSet.id}`)
    }
  }

  private addPersonPubToSet (setId: string, personPub: NormedPersonPublication) {
    const setIdKey = `${setId}`
    const personPubIdKey = `${personPub.id}`
    const titleKey = this.getPublicationTitleKey(personPub.title)
    const doiKey = this.getPublicationDoiKey(personPub.id, personPub.doi, personPub.sourceName, personPub.sourceId)
    const personId = (personPub.person_id ? personPub.person_id : undefined)
    // proceed if set exists
    const set = this.getPersonPubSet(`${setId}`)
    if (set) {
      // do nothing if already in the set
      if (this.getPersonPubSetId(`${personPub.id}`) !== setId) {
        if (set.reviewType !== personPub.reviewTypeStatus) {
          const error = `Warning person pub added to set with mismatched review types. Expected ${personPub.reviewTypeStatus}, found set type: ${set.reviewType}`
          console.log(error)
        }
        this.personPubSetsById[setIdKey].personPublicationIds = _.concat(this.personPubSetsById[setIdKey].personPublicationIds, personPub.id)
        this.personPubSetsById[setIdKey].personPublications = _.concat(this.personPubSetsById[setIdKey].personPublications, personPub)
        this.personPubSetPointer[personPubIdKey] = setId
        if (titleKey) this.personPubSetIdsByTitleKey[titleKey] = setId
        if (doiKey) this.personPubSetIdsByDoiKey[doiKey] = setId
        // console.log(`After add personpub: ${personPubId} to setid: ${setId} pubset pointers are: ${JSON.stringify(this.personPubSetPointer, null, 2)}`)
        const mainPersonPub: NormedPersonPublication = set.mainPersonPub
        if (!set.mainPersonPubId || NormedPersonPublication.getPublicationConfidence(mainPersonPub) < NormedPersonPublication.getPublicationConfidence(personPub)) {
          _.set(set, 'mainPersonPub', personPub)
          _.set(set, 'mainPersonPubId', personPub.id)
        }
      }
    } else {
      const error = `Failed to add personPub with id: ${personPub.id} to set id: ${setId}, personPubSet does not exist`
      console.log(error)
      throw error
    }
  }

  private notInPersonPubSet (personPubId: Number) {
    // true if already in a set
    const key = `${personPubId}`
    return !this.personPubSetPointer[key]
  }

  // this method is not currently thread-safe
  // creates a new person pub set if one does not already exist for the given
  // person Pub Id
  private startPersonPubSet (personPub: NormedPersonPublication): string {
    const titleKey = this.getPublicationTitleKey(personPub.title)
    const doiKey = this.getPublicationDoiKey(personPub.id, personPub.doi, personPub.sourceName, personPub.sourceId)
    if (this.notInPersonPubSet(personPub.id)) {
      // console.log(`Creating person pub set for pub id: ${personPub.id}`)
      const personPubSetId: string = this.getNextPersonPubSetId()
      this.personPubSetPointer[`${personPub.id}`] = personPubSetId
      const pubSet: PublicationSet = {
        id: Number.parseInt(personPubSetId),
        personPublicationIds: [personPub.id],
        personPublications: [personPub],
        mainPersonPubId: personPub.id,
        mainPersonPub: personPub,
        reviewType: personPub.reviewTypeStatus
      }
      this.personPubSetsById[`${personPubSetId}`] = pubSet
      if (titleKey && !this.personPubSetIdsByTitleKey[titleKey]) {
        this.personPubSetIdsByTitleKey[titleKey] = personPubSetId
      }
      if (doiKey && !this.personPubSetIdsByDoiKey[doiKey]) {
        this.personPubSetIdsByDoiKey[doiKey] = personPubSetId
      }
      // now add to graph as well
      this.addPersonPubSetToGraph(pubSet)
      return personPubSetId
    } else {
      const currentSetId: string = this.getPersonPubSetId(`${personPub.id}`)
      const currentSet: PublicationSet = this.getPersonPubSet(`${currentSetId}`)
      if (currentSet.reviewType !== personPub.reviewTypeStatus) {
        const error = `Warning: Mismatch on review type for person Pub set for personPub id: ${personPub.id}, expected review type: ${personPub.reviewTypeStatus} and found review type: ${currentSet.reviewType}`
        console.log(error)
      } else {
        return this.getPersonPubSetId(`${personPub.id}`)
      }
    }
  }

  // returns a person Pub set if it exists for that personPub, else returns undefined
  private getPersonPubSetId (personPubId: string) : string {
    return this.personPubSetPointer[personPubId]
  }

  // this method is not currently thread-safe
  private getNextPersonPubSetId (): string {
    this.personPubSetIdIndex = this.personPubSetIdIndex.valueOf() + 1
    return `${this.personPubSetIdIndex}`
  }
}