//
// Authentication using Passport node module
//
const passport = require(`passport`)
const LocalStrategy = require(`passport-local`).Strategy
const bcrypt = require(`bcryptjs`)
const UsersModel = require(`./controllers/models/UsersModel`)
const AppsModel = require(`./controllers/models/AppsModel`)
const RequestsModel = require(`./controllers/models/RequestRecord`)
const OTTModel = require('./controllers/models/OTTModel')
const jwt = require(`jsonwebtoken`)
const config = require(`../server-settings.json`)
const DriversModel = require('./controllers/models/DriverModel')
const CustomersModel = require('./controllers/models/CustomerModel')
const AuditLogsModel = require('./controllers/models/AuditModel')
const ResetTokensModel = require('./controllers/models/ResetTokensModel')
const DepartmentModel = require('./controllers/models/DepartmentModel')
const client = require(`twilio`)(
  config.server.twilioAccountSid,
  config.server.twilioAuthToken
)

module.exports = function Auth() {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  const verifyUserPassword = (request, username, password, cb) => {
    UsersModel.findOne({ username }, async (err, user) => {
      if (err) {
        cb(err)
      } else if (!user) {
        return cb({
          success: false,
          message: `Username not found or password did not match`,
        })
      } else {
        if (user.is_deleted)
          return cb(null, {
            success: false,
            message: 'You cannot login. You have been deactivated.',
          })

        const rt = await ResetTokensModel.findOne({ user: user._id })
        if (rt != null) {
          return cb(null, {
            success: false,
            message:
              'Please check your email. Reset password sent to your email.',
          })
        }

        // Check password using bcrypt
        // eslint-disable-next-line no-shadow
        bcrypt.compare(password, user.password, async (err, isMatch) => {
          if (err) {
            return cb({ message: err, success: false })
          }
          if (!isMatch) {
            return cb(null, {
              message: `Username not found or password did not match`,
              success: false,
            })
          }

          await sleep(6000).then(() => {
            console.log('')
          })
          //Check for verification cycle already exists and cancel it.
          await client.verify
            .services(config.server.twilioVerifySid)
            .verifications(user.phoneNo)
            .update({ status: 'canceled' })
            .then((verification) => console.log(``))
            .catch((err) => console.log(``))

          await sleep(6000).then(() => {
            console.log('')
          })

          //Sends ott code to user
          await client.verify
            .services(config.server.twilioVerifySid)
            .verifications.create({
              to: user.phoneNo,
              channel: `sms`,
            })
            .then((response) => {
              const token = jwt.sign({ sub: user._id }, config.server.secret, {
                algorithm: 'HS512',
              })
              const data = {
                success: true,
                token: token,
              }

              cb(null, data)
            })
            .catch((ex) => {
              cb(ex, null)
            })
        })
      }
    })
  }

  const verifyAppPassword = function (appname, password, cb) {
    AppsModel.findOne({ name: appname }, (err, app) => {
      if (err) {
        cb(err)
      } else if (!app) {
        return cb(`Invalid credentials`)
      } else {
        // Check password using bcrypt
        // eslint-disable-next-line no-shadow
        bcrypt.compare(password, app.password, (err, isMatch) => {
          if (err) {
            return cb(err)
          }
          if (!isMatch) {
            return cb(`Invalid credentials`)
          }
          const data = {
            isApp: true,
            appId: app._id,
            name: app.name,
            permissions: app.permissions,
          }

          cb(null, data)
        })
      }
    })
  }

  // Basic strategy for users
  passport.use(
    `user-basic`,
    new LocalStrategy(
      {
        usernameField: `username`,
        passwordField: `password`,
        passReqToCallback: true,
      },
      async (req, username, password, done) => {
        verifyUserPassword(req, username, password, (err, data) => {
          if (err) {
            return done(err, false)
          }
          // Password did not match
          if (!data) {
            return done(null, false)
          }
          return done(null, data)
        })
      }
    )
  )

  // Basic strategy for apps
  passport.use(
    `app-basic`,
    new LocalStrategy((appname, password, done) => {
      verifyAppPassword(appname, password, (err, data) => {
        if (err) {
          return done(err)
        }

        // Password did not match
        if (!data) {
          return done(null, false)
        }

        return done(null, data)
      })
    })
  )

  passport.serializeUser((user, done) => {
    done(null, {
      id: user.userId || user.appId,
      isUser: user.isUser || false,
      isApp: user.isApp || false,
    })
  })

  passport.deserializeUser((user, done) => {
    if (user.isApp) {
      const query = AppsModel.findOne({ _id: user.id })
      const promise = query.exec()

      promise.then((app) => {
        if (user) {
          const data = {
            appId: user._id,
            appname: app.name,
            permissions: app.permissions,
            isApp: true,
          }

          done(null, data)
        } else {
          done(`Session not found`, false)
        }
      })
    } else if (user.isUser) {
      const query = UsersModel.findOne({ _id: user.id })
      const promise = query.exec()

      // eslint-disable-next-line no-shadow
      promise.then((user) => {
        if (user) {
          const data = {
            userId: user._id,
            username: user.username,
            email: user.email,
            roles: user.roles,
            isUser: true,
          }

          done(null, data)
        } else {
          done(`Session not found`, false)
        }
      })
    }
  })

  // Export the function to authenticate resource requests
  // store this in a session cookie
  this.isUserAuthenticated = async function (req, res, next) {
    return passport.authenticate(`user-basic`, { session: false })(
      req,
      res,
      next
    )
  }

  this.isAppAuthenticated = function (req, res, next) {
    if (req.user && req.user.isApp) {
      return next()
    }

    return passport.authenticate(`app-basic`, { session: false })(
      req,
      res,
      next
    )
  }

  this.isAnyAuthenticated = function (req, res, next) {
    passport.authenticate(`user-basic`, { session: false })(req, res, (err) => {
      if (err) {
        passport.authenticate(`app-basic`, { session: false })(req, res, next)
      } else {
        return next()
      }
    })
  }

  this.verifyTwilioToken = async (req, res, next) => {
    try {
      const user = await UsersModel.findOne({ username: req.body.username })
      if (!user) {
        res
          .status(401)
          .send({ success: false, message: `the username doesn't exist` })
      }

      //ott code gets verified by twilio
      await client.verify
        .services(config.server.twilioVerifySid)
        .verificationChecks.create({
          to: user.phoneNo,
          code: req.body.token,
        })
        .then(async (response) => {
          if (response.status !== 'approved') {
            return res.status(502).send({
              success: false,
              message: 'Token is Invalid please retry!',
            })
          }

          const bearerToken = req.token

          let customer = null
          let driver = null
          let department = null

          if (user.roles.includes('driver')) {
            driver = await DriversModel.findOne({ userId: user._id })
          }

          if (user.roles.includes('customer')) {
            customer = await CustomersModel.findOne({ userId: user._id })
          }

          if (user.roles.includes('department')) {
            department = await DepartmentModel.findOne({ userId: user._id })
          }

          const data = {
            isUser: true,
            userId: user._id,
            username: user.username,
            email: user.email,
            roles: user.roles,
            bearerToken,
            driver,
            customer,
            department,
          }

          const _ott = {
            oneTimeToken: req.body.token,
            recipientPhoneNo: user.phoneNo,
            recipientEmail: user.email,
            jwtToken: bearerToken,
          }
          const ott = new OTTModel(_ott)
          await ott.save()

          const rm = {
            jwtToken: bearerToken,
            userId: user._id,
            lastReq: Date.now(),
            isExpired: false,
          }

          const foundReq = await RequestsModel.findOne({
            jwtToken: bearerToken,
          })

          if (foundReq === null) {
            const reqmodel = new RequestsModel(rm)

            await reqmodel.save()
          }

          return res.status(200).json({ success: true, data: data })
        })
        .catch((ex) => {
          return res.status(502).send(ex)
        })
    } catch (ex) {
      return res.status(502).send(ex)
    }
  }

  //For stuff that only admin can see
  this.adminGuard = (req, res, next) => {
    let user = req.user
    if (user.roles.includes('admin')) {
      return next()
    }

    return res.sendStatus(401)
  }

  //For stuff that only customer or admin can see.
  this.customerGuard = (req, res, next) => {
    let user = req.user
    if (user.roles.includes('admin') || user.roles.includes('customer')) {
      return next()
    }

    return res.sendStatus(401)
  }

  //For stuff that only driver or admin can see
  this.driverGuard = (req, res, next) => {
    let user = req.user
    if (user.roles.includes('admin') || user.roles.includes('driver')) {
      return next()
    }

    return res.sendStatus(401)
  }

  this.addJobGuard = (req, res, next) => {
    let user = req.user
    if (
      user.roles.includes('admin') ||
      user.roles.includes('customer') ||
      user.roles.includes('driver') ||
      user.roles.includes('department')
    ) {
      return next()
    }

    return res.sendStatus(401)
  }

  this.auditLog = async (req, res, next) => {
    try {
      const auditObject = {
        user_id: req.user._id,
        entity_name: req.url,
        record_id: req.params.id || null,
        action_type: req.method,
      }

      const audit = new AuditLogsModel(auditObject)
      await audit.save()
      return next()
    } catch (err) {
      console.log(err.message)
      return next()
    }
  }

  // Returns the scope as a constructed auth object
  return this
}
