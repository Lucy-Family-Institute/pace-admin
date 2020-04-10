import { make } from 'vuex-pathify'

const state = {
  selectedInstitutions: [],
  filterReviewStates: [],
  selectedPersonSort: undefined,
  selectedPersonPubSort: undefined,
  yearPubStaticMin: 1900,
  yearPubStaticMax: 2200,
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
