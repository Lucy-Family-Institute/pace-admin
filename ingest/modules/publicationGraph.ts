import _ from 'lodash'
import PublicationSet from './publicationSet'
import NormedPersonPublication from './normedPersonPublication'

export default class PublicationGraph {

  // these are helper objects to connect personPubSets together
  // PersonPubId -> Person Pub Set ID Pointers
  private personPubSetPointer: {}
  // PersonPubSet Id -> Person Pub Id list (i.e., the set itself)
  personPubSetsById: {}
  // the current index for personPubSets, will increment whenever adding a new one
  personPubSetIdIndex: Number
  personPublicationsById: {}
  
  constructor () {
    this.personPubSetIdIndex = 0
    this.personPubSetPointer = {}
    this.personPubSetsById = {}
    this.personPublicationsById = {}
  }

  addToGraph (personPubs: NormedPersonPublication[]) {
    // group by title
    // group by doi
    // then insert each set into graph and combine parent set nodes as needed
    // seed the personPublication keys
    const personPublicationsKeys = {}
    _.each(personPubs, (personPub) => {
      personPublicationsKeys[`${personPub.id}`] = {
        titleKey: this.getPublicationTitleKey(personPub.publication.title),
        doiKey: this.getPublicationDoiKey(personPub.publication)
      }
    })
    const publicationsGroupedByTitle = _.groupBy(personPubs, (personPub) => {
      // let title = personPub.publication.title
      const titleKey = personPublicationsKeys[`${personPub.id}`].titleKey
      if (titleKey) {
        return `${titleKey}`
      } else {
        return undefined
      }
    })

    const publicationsGroupedByDoi = _.groupBy(personPubs, (personPub) => {
      // let doi = personPub.publication.doi
      const doiKey = personPublicationsKeys[`${personPub.id}`].doiKey
      return doiKey
    })

    console.log(`Create publication graph...`)
    // keep a map of personPubId to set id in order to find the set that something should be added to if found as same pub
    // merge personPubs together by title and then doi
    _.each(_.keys(publicationsGroupedByTitle), (titleKey) => {
      if (titleKey && titleKey.length > 0) {
        console.log(`Linking person pubs by titleKey: '${titleKey}' personpubs: ${JSON.stringify(publicationsGroupedByTitle[titleKey], null, 2)}`)
        this.linkPersonPubs(publicationsGroupedByTitle[titleKey])
      } else {
        // make independent pub sets for each
        _.each(publicationsGroupedByTitle[titleKey], (pubSet) => {
          this.linkPersonPubs([pubSet])
        })
      }
    })

    // now link together if same doi (if already found above will add to existing set)
    _.each(_.keys(publicationsGroupedByDoi), (doiKey) => {
      if (doiKey !== undefined && doiKey !== 'undefined' && doiKey !== null && this.removeSpaces(doiKey) !== '') {
        console.log(`Linking person pubs by doiKey: '${doiKey}' personpubs: ${JSON.stringify(publicationsGroupedByDoi[doiKey], null, 2)}`)
        this.linkPersonPubs(publicationsGroupedByDoi[doiKey])
      } else {
        // do separate pubset for each doi
        _.each(publicationsGroupedByDoi[doiKey], (pubSet) => {
          this.linkPersonPubs([pubSet])
        })
      }
    })
    console.log(`Finished publication graph.`)
  }

  getAllPublicationSets(): PublicationSet[] {
    return _.values(this.personPubSetsById)
  }

  getPublicationTitleKey (title) {
    // normalize the string and remove characters like dashes as well
    return this.normalizeString(title, true, true)
  }

  getPublicationDoiKey (publication) {
    console.log(`Generating doi key for publication id: ${publication.id} doi: ${publication.doi}`)
    let doiKey
    if (!publication.doi || publication.doi === null || this.removeSpaces(publication.doi) === '') {
      if (publication.source_name && publication.source_id) {
        doiKey = `${publication.source_name}_${publication.source_id}`
      }
    } else {
      doiKey = publication.doi
    }
    console.log(`Generated doi key for publication id: ${publication.id} doi: ${publication.doi} doi key: ${doiKey}`)    
    return doiKey
  }

  removeSpaces (value) {
    if (_.isString(value)) {
      return _.clone(value).replace(/\s/g, '')
    } else {
      return value
    }
  }
  // replace diacritics with alphabetic character equivalents
  normalizeString (value, lowerCase, removeSpaces) {
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

  // will link all personPubs in this list together
  linkPersonPubs (personPubList: NormedPersonPublication[]) {
    // link all person pubs together in this list
    const totalPubs = personPubList.length
    _.each(personPubList, (personPub: NormedPersonPublication, index) => {
      // at last item do nothing
      try {
        if (index === 0 && totalPubs === 1) {
          // console.log(`Linking index: ${index},  only one pub in set, personpub: ${JSON.stringify(personPub['id'], null, 2)}`)
          // will start a new personpub set list if not already in one
          // console.log(`Passing person pub id to start a new set: ${personPub['id']}`)
          this.startPersonPubSet(personPub)
        } else if (index !== (totalPubs - 1)) {
          // console.log(`Linking index: ${index} to ${index + 1} of ${totalPubs}), personpub: ${JSON.stringify(personPub['id'], null, 2)}`)
          const nextPersonPub: NormedPersonPublication = _.nth(personPubList, (index + 1))
          this.linkPersonPubPair(personPub, nextPersonPub)
        }
      } catch (error) {
        console.log(`Warning, error on linking publications: ${error}`)
        throw error
      }
    })
  }
  
  getPersonPubSet (setId: Number): PublicationSet {
    return this.personPubSetsById[`${setId}`]
  }

  // this method will link person pubs by putting them in a person pub set
  // together.  If neither are already in a person pub set, they will be grouped together in a new set
  // If only one has a set, the other will be added to that set
  // If both are currently within a set, it will merge the two sets together
  private linkPersonPubPair (personPub1: NormedPersonPublication, personPub2: NormedPersonPublication) {
    const notInPersonPub1SetId: boolean = this.notInPersonPubSet(personPub1.id)
    const notInPersonPub2SetId: boolean = this.notInPersonPubSet(personPub2.id)
    const personPubSet1Id: Number = this.getPersonPubSetId(personPub1)
    const personPubSet2Id: Number = this.getPersonPubSetId(personPub2)
    // console.log(`Linking person pub id 1: ${personPub1.id} to person pub id 2: ${personPub2.id}`)
    if (notInPersonPub1SetId && notInPersonPub2SetId) {
      // neither one is in a set yet and just add to set list
      // console.log(`Starting new set for personPubId1: ${personPub1.id}`)
      const newSetId: Number = this.startPersonPubSet(personPub1)
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

  private mergePersonPubSets (set1Id: Number, set2Id: Number) {
    // do nothing if they are the same set id
    // console.log(`Merging person pub sets set1: ${set1Id} set2: ${set2Id}`)
    if (set1Id !== set2Id) {
      // add items from set2 into set1 if not already there, assumes everything is up to date with pointers
      const set1: PublicationSet = this.getPersonPubSet(set1Id)
      const set2: PublicationSet = this.getPersonPubSet(set2Id)
      if (set1.reviewType !== set2.reviewType) {
        const error = `Warning: Mismatch in reviewType for sets to be merged. found set 1: ${set1.reviewType} set 2: ${set2.reviewType}`
        console.log(error)
      }
      const set2List: NormedPersonPublication[] = set2.personPublications
      _.each(set2List, (personPub: NormedPersonPublication) => {
        this.addPersonPubToSet(set1Id, personPub)
      })
      // destroy the set2List
      this.removePersonPubSet(set2Id)
    }
  }

  private removePersonPubSet (setId: Number) {
    // only works if personPubs in this set already pointing to another one, else throw error
    // do nothing if set already gone
    const set = this.getPersonPubSet(setId)
    if (set) {
      _.each(set.personPublications, (personPub) => {
        if (setId && this.getPersonPubSetId(personPub) === setId) {
          const error = `Cannot remove person Pub Set (on merge), personPubId: ${personPub.id} not in any other set`
          console.log(error)
          throw error
        }
      })
      // if we get this far no errors encountered, and all person pubs are now in another set
      // go ahead and delete it
      _.unset(this.personPubSetsById, `${setId}`)
    }
  }

  private addPersonPubToSet (setId: Number, personPub: NormedPersonPublication) {
    const setIdKey = `${setId}`
    const personPubIdKey = `${personPub.id}`
    // proceed if set exists
    const set = this.getPersonPubSet(setId)
    if (set) {
      // do nothing if already in the set
      if (this.getPersonPubSetId(personPub) !== setId) {
        if (set.reviewType !== personPub.reviewTypeStatus) {
          const error = `Warning person pub added to set with mismatched review types. Expected ${personPub.reviewTypeStatus}, found set type: ${set.reviewType}`
          console.log(error)
        }
        this.personPubSetsById[setIdKey].personPublicationIds = _.concat(this.personPubSetsById[setIdKey].personPublicationIds, personPub.id)
        this.personPubSetsById[setIdKey].personPublications = _.concat(this.personPubSetsById[setIdKey].personPublications, personPub)
        this.personPubSetPointer[personPubIdKey] = setId
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
  private startPersonPubSet (personPub: NormedPersonPublication): Number {
    if (this.notInPersonPubSet(personPub.id)) {
      // console.log(`Creating person pub set for pub id: ${personPub.id}`)
      const personPubSetId: Number = this.getNextPersonPubSetId()
      this.personPubSetPointer[`${personPub.id}`] = personPubSetId
      const pubSet: PublicationSet = {
        personPublicationIds: [personPub.id],
        personPublications: [personPub],
        mainPersonPubId: personPub.id,
        mainPersonPub: personPub,
        reviewType: personPub.reviewTypeStatus
      }
      this.personPubSetsById[`${personPubSetId}`] = pubSet
      return personPubSetId
    } else {
      const currentSetId: Number = this.getPersonPubSetId(personPub)
      const currentSet: PublicationSet = this.getPersonPubSet(currentSetId)
      if (currentSet.reviewType !== personPub.reviewTypeStatus) {
        const error = `Warning: Mismatch on review type for person Pub set for personPub id: ${personPub.id}, expected review type: ${personPub.reviewTypeStatus} and found review type: ${currentSet.reviewType}`
        console.log(error)
      } else {
        return this.getPersonPubSetId(personPub)
      }
    }
  }

  // returns a person Pub set if it exists for that personPub, else returns undefined
  private getPersonPubSetId (personPub: NormedPersonPublication): Number {
    return this.personPubSetPointer[`${personPub.id}`]
  }

  // this method is not currently thread-safe
  private getNextPersonPubSetId (): Number {
    this.personPubSetIdIndex = this.personPubSetIdIndex.valueOf() + 1
    return this.personPubSetIdIndex
  }
}