import { make } from 'vuex-pathify'

const state = {
  selectedInstitutions: [],
  institutionOptions: [],
  preferredPersonSort: 'Total',
  preferredPersonTotal: 'Pending',
  preferredPersonPubSort: 'Confidence',
  preferredCenterPubSort: 'Authors',
  preferredInstitutionReviewState: 'Accepted',
  preferredSelectedCenterAuthor: 'All',
  filterReviewStates: [],
  centerAuthorOptions: [
    'All'
  ],
  selectedPersonSort: undefined,
  selectedPersonPubSort: undefined,
  selectedCenterPubSort: undefined,
  selectedCenterAuthor: undefined,
  selectedPersonTotal: undefined,
  selectedInstitutionReviewState: undefined,
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
  pubSearch: '',
  dashboardMiniState: false,
  facetFilters: [],
  facetsDistribution: null
  // refreshCharts: 0
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
