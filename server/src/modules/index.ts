import _ from 'lodash'

const middlewareCache = {}

export async function loadModule (
  label: string, 
  config: any,
  app: any,
  options?: any
) {
  let value: any
  if (options === undefined) {
    options = {}
  }
  options['app'] = app
  options['middleware'] = middlewareCache

  // init
  value = _.get(config, 'init', undefined)
  if(value !== undefined) {
    await value(options)
  }

  // middleware
  value = _.get(config, 'middleware', undefined)
  if(value !== undefined) {
    _.forEach(value, async (middleware) => {
      let middlewareToUse
      if (_.isPlainObject(middleware)) {
        middlewareToUse = middleware.func(options)
        middlewareCache[middleware.label] = middlewareToUse
      } else if (_.isFunction(middleware)) {
        middlewareToUse = middleware(options)
      }
      app.use(middlewareToUse)
    })
  }

  // webhooks
  value = _.get(config, 'webhooks', undefined)
  if(value !== undefined) {
    throw new Error('Webhooks are not implemented yet')
  }

  // routes
  value = _.get(config, 'routes', undefined)
  if(value !== undefined) {
    _.forEach(value, (route) => {
      if(route.middleware !== undefined) {
        if (!_.isArray(route.middleware)) {
          app.get(route.path, _.get(middlewareCache, route.middleware), route.func(options))
        } else {
          throw new Error('Arrays of middleware are not implemented')
        }
      } else {
        app.get(route.path, route.func(options))
      }
    })
  }
}