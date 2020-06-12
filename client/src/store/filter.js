import { make } from 'vuex-pathify'

const state = {
  selectedInstitutions: [],
  institutionOptions: [],
  preferredPersonSort: 'Total',
  preferredPersonTotal: 'Pending',
  preferredPersonPubSort: 'Confidence',
  preferredCenterPubSort: 'Authors',
  preferredInstitutionReviewState: 'Accepted',
  filterReviewStates: [],
  selectedPersonSort: undefined,
  selectedPersonPubSort: undefined,
  selectedCenterPubSort: undefined,
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
