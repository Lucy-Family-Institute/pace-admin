import { store } from 'quasar/wrappers'
import { createStore } from 'vuex'

import createPersistedState from 'vuex-persistedstate'
import pathify from './pathify'

import admin from './admin'
import auth from './auth'
import filter from './filter'
import dashboard from './dashboard'

/*
 * If not building with SSR mode, you can
 * directly export the Store instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Store instance.
 */

export default store(function (/* { ssrContext } */) {
  const Store = createStore({
    plugins: [createPersistedState({
      paths: ['filter', 'dashboard']
    }), pathify.plugin],

    modules: {
      admin,
      auth,
      filter,
      dashboard
    },

    // enable strict mode (adds overhead!)
    // for dev mode and --debug builds only
    strict: process.env.DEBUGGING
  })

  return Store
})
