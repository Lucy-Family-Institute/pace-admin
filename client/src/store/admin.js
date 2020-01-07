export default {
  namespaced: true,
  state: {
    adminState: [],
    isBulkEditing: false,
    logCount: 0,
    acceptedCount: 0,
    rejectedCount: 0,
    unsureCount: 0
  },
  getters: {
    adminState: state => state.adminState,
    isBulkEditing: state => state.isBulkEditing,
    logCount: state => state.logCount,
    acceptedCount: state => state.acceptedCount,
    rejectedCount: state => state.rejectedCount
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
    },
    incrementAcceptedCount: (state) => {
      state.acceptedCount += 1
    },
    incrementRejectedCount: (state) => {
      state.rejectedCount += 1
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
    },
    incrementAcceptedCount: ({ getters, commit }) => {
      return new Promise(async (resolve, reject) => {
        commit('incrementAcceptedCount')
        resolve(getters.acceptedCount)
      })
    },
    incrementRejectedCount: ({ getters, commit }) => {
      return new Promise(async (resolve, reject) => {
        commit('incrementRejectedCount')
        resolve(getters.rejectedCount)
      })
    }
  }
}
