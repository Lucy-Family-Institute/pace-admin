import passport from 'passport'

passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((id, done) => {
  done(null, id)
})

export default {
  middleware: [ 
    () => passport.initialize(),
    () => passport.session()
  ]
}