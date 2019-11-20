export default {
  namespaced: true,
  state: {
    adminState: [],
    isBulkEditing: false,
    logCount: 0
  },
  getters: {
    adminState: state => state.adminState,
    isBulkEditing: state => state.isBulkEditing,
    logCount: state => state.logCount
  },
  mutations: {
    changeState: (state, stateArray) => {
      state.adminState = stateArray
    },
    toggleBulkEditing: (state) => {
      state.isBulkEditing = !state.isBulkEditing
    },
    incrementLogCount: (state) => {
      state.logCount += 1
    }
  },
  actions: {
    toggleBulkEditing: ({ getters, commit }) => {
      return new Promise(async (resolve, reject) => {
        commit('toggleBulkEditing')
        resolve(getters.isBulkEditing)
      })
    },
    incrementLogCount: ({ getters, commit }) => {
      return new Promise(async (resolve, reject) => {
        commit('incrementLogCount')
        resolve(getters.logCount)
      })
    }
  }
}
