import { make } from 'vuex-pathify'

const state = {
  selectedInstitutions: [],
  filterReviewStates: [],
  selectedPersonSort: undefined,
  yearStaticMin: 1900,
  yearStaticMax: 2200,
  selectedYears: {
    min: 1900,
    max: 2200
  }
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
