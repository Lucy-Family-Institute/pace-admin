import { make } from 'vuex-pathify'

const state = {
  selectedInstitutions: [],
  yearMin: 1972,
  yearMax: 2020,
  years: {
    min: 1972,
    max: 2020
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
