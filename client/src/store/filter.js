import { make } from 'vuex-pathify'

const state = {
  personSortKey: 0,
  preferredSelectedCenter: { label: 'Harper Cancer Research Institute', value: 'HCRI' },
  selectedCenter: { label: 'Harper Cancer Research Institute', value: 'HCRI' },
  centerOptions: [],
  selectedInstitutions: [],
  institutionOptions: [],
  preferredPersonSort: 'Total',
  preferredPersonTotal: 'Pending',
  preferredPersonConfidence: 'None',
  preferredPersonPubSort: 'Confidence',
  preferredCenterPubSort: 'Authors',
  preferredInstitutionReviewState: 'Accepted',
  preferredSelectedCenterAuthor: 'All',
  preferredSelectedAuthorReview: { label: 'Lucy Family Institute for Data & Society', value: 'LFIDS' },
  filterReviewStates: [],
  centerAuthorOptions: [
    'All'
  ],
  selectedPersonSort: undefined,
  selectedPersonPubSort: undefined,
  selectedCenterPubSort: undefined,
  selectedCenterAuthor: undefined,
  selectedPersonTotal: undefined,
  selectedPersonConfidence: 'All',
  selectedInstitutionReviewState: 'Accepted',
  yearPubStaticMin: 1900,
  yearPubStaticMax: 2200,
  changedPubYears: undefined,
  changedMemberYears: undefined,
  selectedPubYears: {
    min: 1900,
    max: 2200
  },
  yearMemberStaticMin: 1900,
  yearMemberStaticMax: 2200,
  selectedMemberYears: {
    min: 1900,
    max: 2200
  },
  pubSearch: ''
}

const getters = {
  ...make.getters(state)
}

const mutations = {
  ...make.mutations(state)
}

const actions = {
  ...make.actions(state)
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
