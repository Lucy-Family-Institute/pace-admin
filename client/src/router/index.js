import Vue from 'vue'
import VueRouter from 'vue-router'

import { makeRoutes, makeBeforeEach } from './routes'

Vue.use(VueRouter)

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation
 */

export default function ({ store, ssrContext }) {
  const router = new VueRouter({
    scrollBehavior: () => ({ x: 0, y: 0 }),
    routes: makeRoutes(store),
    // Leave these as is and change from quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    mode: process.env.VUE_ROUTER_MODE,
    base: process.env.VUE_ROUTER_BASE
  })

  router.beforeEach(makeBeforeEach(store))

  return router
}
