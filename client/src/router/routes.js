import axios from 'axios'
import _ from 'lodash'

export function makeBeforeEach (store) {
  return async (to, from, next) => {
    const desiredPort = process.env.ENV === 'prod'
      ? process.env.APP_PORT_PROD
      : process.env.APP_PORT_DEV
    if (window.location.port !== `${desiredPort}`) {
      window.location.port = desiredPort
    }
    if (!store.get('auth/isLoggedIn')) {
      try {
        const response = await axios({ url: '/session', method: 'GET' })
        const userId = _.get(response, 'data.databaseId')
        const name = _.get(response, 'data.name')
        if (userId) {
          store.set('auth/isLoggedIn', true)
          store.set('auth/userId', userId)
          store.set('auth/name', name)
        } else {
          store.set('auth/isLoggedIn', false)
          store.set('auth/userId', null)
          store.set('auth/name', null)
          if (!['/'].includes(to.path)) {
            return next('/')
          }
        }
      } catch (error) { // TODO specify the error
        // this.isBackendDisconnected = true
      }
    }
    return next()
  }
}

export function makeRoutes (store) {
  const routes = [
    {
      path: '/',
      component: () => import('layouts/Landing.vue'),
      children: [
        {
          path: '',
          beforeEnter: (to, fro, next) => {
            if (store.get('auth/isLoggedIn')) {
              return next('/review')
            }
            return next()
          },
          component: () => import('pages/PublicLanding.vue')
        }
      ]
    },
    {
      path: '/review/',
      component: () => import('layouts/Base.vue'),
      children: [
        {
          path: '',
          component: () => import('pages/Review.vue')
        }
      ]
    },
    {
      path: '/dashboard/',
      component: () => import('layouts/Base.vue'),
      children: [
        {
          path: '',
          component: () => import('pages/Dashboard.vue')
        }
      ]
    }
    // { path: 'logs', component: () => import('pages/Index.vue') },
    // { path: 'dashboard', component: () => import('pages/Dashboard.vue') },
    // { path: 'center_review', component: () => import('pages/CenterReview.vue') }
    //   ]
    // }
  ]

  // Always leave this as last one
  if (process.env.MODE !== 'ssr') {
    routes.push({
      path: '*',
      component: () => import('pages/Error404.vue')
    })
  }
  return routes
}
