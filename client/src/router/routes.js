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
        if (_.get(response.data, 'databaseId') !== undefined) {
          store.set('auth/isLoggedIn', true)
          store.set('auth/userId', response.data.databaseId)
        } else {
          store.set('auth/isLoggedIn', false)
          store.set('auth/userId', null)
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
              next('/review')
            }
            next()
          },
          component: () => import('pages/PublicLanding.vue')
        },
        {
          path: 'review',
          component: () => import('layouts/Base.vue'),
          children: [
            {
              path: '',
              component: () => import('pages/Index.vue')
            }
          ]
        }
        // { path: 'review', component: () =>  },
        // { path: 'logs', component: () => import('pages/Index.vue') },
        // { path: 'dashboard', component: () => import('pages/Dashboard.vue') },
        // { path: 'center_review', component: () => import('pages/CenterReview.vue') }
      ]
    }
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
