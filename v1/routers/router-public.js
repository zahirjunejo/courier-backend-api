const swaggerUi = require(`swagger-ui-express`)
const ymlfile = require(`../helpers/documentation`)
const router = require(`express`).Router()

// Require the auth module
const _auth = require(`../auth`)

// USERS RESOURCE
const users = require(`../controllers/Users`)
const MagicLink = require(`../controllers/MagicLink`)
const Upload = require('../controllers/Upload')
const pastjob = require('../controllers/PastJobs')
const OTT = require(`../controllers/OTT`)
const RequestsModel = require(`../controllers/models/RequestRecord`)
const Geolocation = require('../controllers/Geolocation')
const authentication = require('../middleware/validateJWT')
const tokenMW = require('../middleware/BearerTokenHelper')
const supportInfo = require(`../controllers/SupportInfo`)
const fs = require('fs')

module.exports = function RouterPublic(database, settings) {
  const db = database
  const auth = _auth()
  router.use(tokenMW.setToken)
  router.use(async (req, res, next) => {
    if (req.token) {
      const rm = await RequestsModel.findOne({ jwtToken: req.token })
      if (rm !== null) {
        if (rm.isExpired) {
          return next()
        }
        rm.lastReq = Date.now()
        await rm.save()
      }
    }
    next()
  })

  const customCSS = fs.readFileSync('v1/helpers/custom.css')
  router.use(
    `/docs`,
    swaggerUi.serve,
    swaggerUi.setup(ymlfile, {
      customCss: customCSS,
    })
  )
  router.get(
    `/login`,
    auth.isUserAuthenticated,
    auth.auditLog,
    async (req, res) => {
      const { success, ...rest } = req.user
      if (success) {
        return res.status(200).json({
          success: success,
          message: 'Login success!',
          data: rest,
        })
      } else {
        return res.status(502).json({
          success: success,
          message: rest.message,
        })
      }
    }
  )

  router.route(`/verifyToken`).post(auth.verifyTwilioToken)

  router.route(`/users`).post(users.AddUser)

  router.route(`/MagicLink`).post(MagicLink.sendMagicLink).get(MagicLink.verify)

  router.route(`/session/renew`).post(OTT.verify)
  router.route('/ott/resend').get(authentication.authenticate, OTT.resendOTT)

  router.route('/geolocation/estimate').post(Geolocation.estimateDistance)

  router.route('/testmail').post(MagicLink.testMail)

  router.route(`/supportInfo`).get(supportInfo.getSupportInfos)
  router.route(`/sendsupportemail/:id`).post(supportInfo.sendSupportEmail)

  router.get('/uploads/:id', Upload.getUploadFile)
  router.post('/forget-password', users.ForgetPassword)
  router.put('/forget-password-verify/:token', users.ForgetPasswordVerify)
  router.post('/roads', Geolocation.Roads)
  router.post('/geoupdate', Geolocation.updateGeolocationById)

  // router.get('/seed', pastjob.pastJobSeed)

  return router
}
