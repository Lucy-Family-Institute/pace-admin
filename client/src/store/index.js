import Vue from 'vue'
import Vuex from 'vuex'
// import VuexPersist from 'vuex-persist'
import createPersistedState from 'vuex-persistedstate'
// import { localForageService } from './localForage'

import pathify from './pathify'

import admin from './admin'
import auth from './auth'
import filter from './filter'
import dashboard from './dashboard'

Vue.use(Vuex)

// const vuexLocalStorage = new VuexPersist({
//   key: 'vuex', // The key to store the state on in the storage provider.
//   storage: window.localStorage // or window.sessionStorage or localForage
//   // Function that passes the state and returns the state with only the objects you want to store.
//   // reducer: state => state,
//   // Function that passes a mutation and lets you decide if it should update the state in localStorage.
//   // filter: mutation => (true)
// })

// const vuexLocal = new VuexPersist({
//   // vuex-persist
//   storage: localForageService, // localForage
//   asyncStorage: true,
//   key: 'vuexPersistStorage_test',
//   supportCircular: true,
//   saveState: async (key, state, storage) => {
//     let data = state

//     if (storage && data) {
//     }
//     storage.setItem(key, data)
//   },
//   restoreState: async function (key, storage) {
//     let data = await storage.getItem(key)
//     if (await data) {
//       try {
//       } catch (e) {
//         console.log(e)
//       }
//     }
//     return data
//   }
// })

/*
 * If not building with SSR mode, you can
 * directly export the Store instantiation
 */

export default function (/* { ssrContext } */) {
  const Store = new Vuex.Store({
    plugins: [ createPersistedState({
      paths: ['filter', 'dashboard']
    }), pathify.plugin ],

    modules: {
      admin,
      auth,
      filter,
      dashboard
    },

    // enable strict mode (adds overhead!)
    // for dev mode only
    strict: process.env.DEV
  })

  return Store
}
