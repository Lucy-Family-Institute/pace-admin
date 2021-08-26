import _ from 'lodash'
import session from 'express-session'
import redis from 'redis'
import redisStore from 'connect-redis'
import { Request, Response } from 'express'

const RedisStore = redisStore(session)
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST, 
  port: process.env.REDIS_PORT
})
const store = new RedisStore({
  client: redisClient,
  ttl: 86400
})

function sessionMiddleware (options: any) {
  return session({
    name: options.name,
    secret: options.secret,
    resave: false,
    saveUninitialized: true,
    store,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000 // TODO currently month in ms
    }
  })
}

export default {
  middleware: [{
    label: 'session',
    func: sessionMiddleware
  }]
}