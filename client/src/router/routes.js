import axios from 'axios'

export function makeBeforeEach (store) {
  return async (to, from, next) => {
    // const desiredPort = process.env.ENV === 'prod'
    //   ? process.env.APP_PORT_PROD
    //   : process.env.APP_PORT_DEV
    // if (window.location.port !== `${desiredPort}`) {
    //   window.location.port = desiredPort
    // }
    if (!store.get('auth/isLoggedIn')) {
      try {
        const response = await axios({ url: '/session', method: 'GET' })
        const userId = response.data ? response.data.databaseId : null
        const name = (response.data && response.data.name) ? response.data.name : null
        const role = (response.data && response.data.role) ? response.data.role : 'anonymous'
        const orgs = (response.data && response.data.orgs) ? response.data.orgs : []
        if (userId) {
          store.set('auth/isLoggedIn', true)
          store.set('auth/userId', userId)
          store.set('auth/name', name)
          store.set('auth/role', role)
          store.set('auth/orgs', orgs)
        } else {
          store.set('auth/isLoggedIn', false)
          store.set('auth/userId', null)
          store.set('auth/name', null)
          store.set('auth/role', 'anonymous')
          store.set('auth/orgs', [])
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
          name: 'home',
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
      path: '/review',
      component: () => import('layouts/Base.vue'),
      children: [
        {
          name: 'review',
          path: '',
          component: () => import('pages/Index.vue')
        }
      ]
    },
    {
      path: '/dashboard',
      component: () => import('layouts/Base.vue'),
      children: [
        {
          name: 'dashboard',
          path: '',
          component: () => import('pages/dashboard/Index.vue')
        },
        {
          name: 'search',
          path: 'search',
          component: () => import('pages/dashboard/Search.vue')
        }
      ]
    },
    {
      path: '/center-review',
      component: () => import('layouts/Base.vue'),
      children: [
        {
          name: 'center-review',
          path: '',
          component: () => import('pages/CenterReview.vue')
        }
      ]
    },
    {
      path: '/center_review', redirect: { name: 'center_review' }
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
