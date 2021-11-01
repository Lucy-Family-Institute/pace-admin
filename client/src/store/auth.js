import { make } from 'vuex-pathify'

const state = {
  userId: null,
  isLoggedIn: false,
  name: null,
  role: 'anonymous',
  orgs: []
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
