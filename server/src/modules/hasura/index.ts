import _ from 'lodash'
import express from 'express'

async function init (options) {
  const app = options.app
  app.get('/webhooks/hasura',
    (req: express.Request, res: express.Response) => {
      if (_.get(req, 'session')) {
        if (_.get(req, 'session.passport.user.databaseId')) {
          res.json({
            'X-Hasura-Admin-Secret': options.secret,
            'X-Hasura-Role': 'user',
            'X-Hasura-User-Id': `${req['session'].passport.user.databaseId}`
          })
        } else {
          res.json({
            'X-Hasura-Admin-Secret': 'options.secret',
            'X-Hasura-Role': 'anonymous_user'
          })
        }
      } else {
        res.status(401).send('Hasura failed to Authenticate the request.')
      }
    }
  )
}

export default {
  init
}