export default {
  namespaced: true,
  state: {
    adminState: [],
    isBulkEditing: false
  },
  getters: {
    adminState: state => state.adminState,
    isBulkEditing: state => state.isBulkEditing
  },
  mutations: {
    changeState: (state, stateArray) => {
      state.adminState = stateArray
    },
    toggleBulkEditing: (state) => {
      state.isBulkEditing = !state.isBulkEditing
    }
  },
  actions: {
    toggleBulkEditing: ({ getters, commit }) => {
      console.log('here')
      return new Promise(async (resolve, reject) => {
        commit('toggleBulkEditing')
        resolve(getters.isBulkEditing)
      })
    }
  }
}
