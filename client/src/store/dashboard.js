import { make } from 'vuex-pathify'

const state = {
  dashboardMiniState: false,
  graphKey: 0,
  facetFilters: [],
  facetsDistribution: null,
  results: [],
  selectedCenter: undefined,
  selectedYear: undefined
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
