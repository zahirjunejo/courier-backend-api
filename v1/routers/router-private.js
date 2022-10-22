const router = require(`express`).Router()
const path = require(`path`)
const multer = require(`multer`)
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, `uploads/`)
  },
  filename(req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)) // Appending extension
  },
})
const uploader = multer({ storage })
const uploaderSettings = uploader.fields([
  { name: `attachments`, maxCount: 4 },
  { name: `photos`, maxCount: 4 },
  { name: `signatures`, maxCount: 4 },
])

// USERS RESOURCE
const auth = require('../auth')
const users = require(`../controllers/Users`)
const apps = require(`../controllers/Apps`)
const department = require(`../controllers/Department`)
const audit = require(`../controllers/Audit`)
const driver = require(`../controllers/Driver`)
const jobs = require(`../controllers/Jobs`)
const supportInfo = require(`../controllers/SupportInfo`)
const template = require(`../controllers/Template`)
const upload = require(`../controllers/Upload`)
const customer = require(`../controllers/Customers`)
const CalenderEvent = require(`../controllers/CalenderEvent`)
const QueuedJob = require(`../controllers/QueuedJob`)
const Task = require(`../controllers/Task`)
const chargeType = require('../controllers/ChargeType')
const pastJobs = require('../controllers/PastJobs')
const RequestsModel = require(`../controllers/models/RequestRecord`)
const authentication = require('../middleware/validateJWT')
const Schemas = require('../controllers/Schemas')
const Geolocation = require('../controllers/Geolocation')
const WeeklyRoute = require('../controllers/WeeklyRoute')
const Billing = require('../controllers/Billing')
const tokenMW = require('../middleware/BearerTokenHelper')

module.exports = function RouterPrivate(database, settings) {
  const _auth = auth()
  router.use(tokenMW.setToken)
  router.use(authentication.authenticate)
  // router.use(async (req, res, next) => {
  //   if (req.token) {
  //     const rm = await RequestsModel.findOne({ jwtToken: req.token })
  //     if (rm !== null) {
  //       if (rm.isExpired) {
  //         return res
  //           .status(502)
  //           .json({ status: `Expired`, error: `Use the last ott sent to you.` })
  //       } else {
  //         rm.lastReq = Date.now()
  //         await rm.save()
  //         next()
  //       }
  //     } else {
  //       return res
  //         .status(502)
  //         .json({ status: `Error`, error: `Please verify your OTT first.` })
  //     }
  //   }
  // })

  // Will always logout and clear the session cookie
  router.get(`/logout`, _auth.auditLog, (req, res) => {
    req.logout()
    res.clearCookie(`${settings.server.name} Cookie`)
    res.status(200).json({
      success: true,
    })
  })

  router
    .route(`/users`)
    .get(_auth.adminGuard, _auth.auditLog, users.GetUsersList)

  router
    .route(`/users/:id`)
    .get(_auth.auditLog, users.GetUserByID)
    .put(_auth.auditLog, users.UpdateUser)
    .delete(_auth.auditLog, users.DeleteUser)

  router.route(`/apps`).post(_auth.auditLog, apps.Add)

  router
    .route(`/users/since/:time`)
    .get(_auth.auditLog, users.GetUsersAfterDate)

  router
    .route(`/customer`)
    .post(
      _auth.customerGuard,
      uploaderSettings,
      _auth.auditLog,
      customer.addCustomer
    )
    .get(_auth.addJobGuard, _auth.auditLog, customer.getCustomers)
  router
    .route(`/customer-address-autocomplete`)
    .post(
      _auth.addJobGuard,
      _auth.auditLog,
      customer.getCustomersAddressAutoComplete
    )
  router
    .route(`/customer/:id`)
    .put(
      _auth.customerGuard,
      uploaderSettings,
      _auth.auditLog,
      customer.updateCustomer
    )
    .get(_auth.customerGuard, _auth.auditLog, customer.getCustomer)
    .delete(_auth.customerGuard, _auth.auditLog, customer.deleteCustomer)
  router.get(
    '/customersbyname',
    _auth.addJobGuard,
    _auth.auditLog,
    customer.getCustomerByName
  )

  router
    .route(`/department`)
    .post(_auth.adminGuard, _auth.auditLog, department.addDepartments)
  router
    .route(`/department/:id`)
    .put(_auth.adminGuard, _auth.auditLog, department.UpdateDepartment)
    .get(_auth.adminGuard, _auth.auditLog, department.GetDepartment)
    .delete(_auth.adminGuard, _auth.auditLog, department.DeleteDepartment)

  router
    .route('/weekly')
    .post(_auth.auditLog, WeeklyRoute.addWeeklyRoute)
    .get(_auth.auditLog, WeeklyRoute.getWeeklyRoutes)
  router
    .route('/weekly/:id')
    .put(_auth.auditLog, WeeklyRoute.updateWeeklyRoute)
    .get(_auth.auditLog, WeeklyRoute.getWeeklyRoute)
    .delete(_auth.auditLog, WeeklyRoute.deleteWeeklyRoutes)

  router
    .route(`/audit`)
    .post(_auth.adminGuard, audit.addAudit)
    .get(_auth.adminGuard, audit.getAudits)
  router
    .route(`/audit/:id`)
    .put(_auth.adminGuard, audit.updateAudit)
    .get(_auth.adminGuard, audit.getAudit)
    .delete(_auth.adminGuard, audit.deleteAudit)

  router
    .route(`/chargeType`)
    .post(_auth.adminGuard, _auth.auditLog, chargeType.addChargeType)
    .get(_auth.addJobGuard, _auth.auditLog, chargeType.getChargeTypes)
  router
    .route(`/chargeType/:id`)
    .put(_auth.adminGuard, _auth.auditLog, chargeType.updateChargeType)
    .get(_auth.adminGuard, _auth.auditLog, chargeType.getChargeType)
    .delete(_auth.adminGuard, _auth.auditLog, chargeType.deleteChargeType)

  router
    .route(`/driver`)
    .post(_auth.driverGuard, uploaderSettings, _auth.auditLog, driver.addDriver)
    .get(_auth.adminGuard, _auth.auditLog, driver.getDrivers)
  router
    .route('/driversonline')
    .get(_auth.customerGuard, _auth.auditLog, driver.getOnlineDrivers)
  router
    .route(`/driver/:id`)
    .put(
      _auth.driverGuard,
      uploaderSettings,
      _auth.auditLog,
      driver.updateDriver
    )
    .get(_auth.driverGuard, _auth.auditLog, driver.getDriver)
    .delete(_auth.driverGuard, _auth.auditLog, driver.deleteDriver)

  router
    .route(`/jobs`)
    .post(_auth.addJobGuard, _auth.auditLog, jobs.addJob)
    .get(_auth.adminGuard, _auth.auditLog, jobs.getJobs)
  router
    .route(`/jobs/:id`)
    .put(_auth.adminGuard, _auth.auditLog, jobs.updateJob)
    .get(_auth.adminGuard, _auth.auditLog, jobs.getJob)
    .delete(_auth.adminGuard, _auth.auditLog, jobs.deleteJob)
  router
    .route('/jobs/accept/:id')
    .put(_auth.adminGuard, _auth.auditLog, jobs.acceptJob)
  router
    .route('/jobs/reject/:id')
    .put(_auth.driverGuard, _auth.auditLog, jobs.rejectJob)
  router.route('/jobs/skiptask/:jobId/:taskId').put(jobs.skipTask)
  router.put('/completejob/:id', jobs.completeJob)
  router.put('/canceljob/:id', jobs.cancelJob)
  router
    .route('/pendingstatjobs')
    .get(_auth.adminGuard, _auth.auditLog, jobs.getPendingStatJobs)

  router
    .route(`/pastjobs`)
    .post(_auth.adminGuard, _auth.auditLog, pastJobs.addpastJob)
    .get(_auth.adminGuard, _auth.auditLog, pastJobs.getallpastJob)
  router
    .route(`/pastjobs/:id`)
    .put(_auth.adminGuard, _auth.auditLog, pastJobs.updatepastJob)
    .get(_auth.adminGuard, _auth.auditLog, pastJobs.getpastJob)
    .delete(_auth.adminGuard, _auth.auditLog, pastJobs.deletepastJob)

  router
    .route(`/supportInfo`)
    .post(_auth.adminGuard, _auth.auditLog, supportInfo.addSupportInfo)
  router
    .route(`/supportInfo/:id`)
    .put(_auth.adminGuard, _auth.auditLog, supportInfo.updateSupportInfo)
    .get(_auth.adminGuard, _auth.auditLog, supportInfo.getSupportInfo)
    .delete(_auth.adminGuard, _auth.auditLog, supportInfo.deleteSupportInfo)

  router
    .route(`/template`)
    .post(
      _auth.adminGuard,
      uploader.single(`template`),
      _auth.auditLog,
      template.addTemplate
    )
    .get(_auth.adminGuard, _auth.auditLog, template.getTemplates)

  router
    .route(`/template/:id`)
    .put(
      _auth.adminGuard,
      uploader.single(`template`),
      _auth.auditLog,
      template.updateTemplate
    )
    .get(_auth.adminGuard, _auth.auditLog, template.getTemplate)
    .delete(_auth.adminGuard, _auth.auditLog, template.deleteTemplate)

  router
    .route(`/CalendarEvent`)
    .post(_auth.adminGuard, _auth.auditLog, CalenderEvent.addCalendarEvent)
  router
    .route(`/CalendarEvent/:id`)
    .put(_auth.adminGuard, _auth.auditLog, CalenderEvent.updateCalendarEvent)
    .get(_auth.adminGuard, _auth.auditLog, CalenderEvent.getCalendarEvent)
    .delete(_auth.adminGuard, _auth.auditLog, CalenderEvent.deleteCalendarEvent)
  router
    .route('/CalendarEvent/:day/:month/:year')
    .get(_auth.adminGuard, _auth.auditLog, CalenderEvent.getCalendarEventByDate)

  router
    .route(`/QueuedJob`)
    .post(_auth.adminGuard, _auth.auditLog, QueuedJob.addQueuedJob)
    .get(_auth.auditLog, QueuedJob.getQueuedJobs)
  router
    .route(`/QueuedJob/:id`)
    .put(_auth.adminGuard, _auth.auditLog, QueuedJob.updateQueuedJob)
    .get(_auth.adminGuard, _auth.auditLog, QueuedJob.getQueuedJob)
    .delete(_auth.adminGuard, _auth.auditLog, QueuedJob.deleteQueuedJob)
  router
    .route('/QueuedJob/assign/:id/to/:driverId')
    .put(_auth.adminGuard, _auth.auditLog, QueuedJob.ToJob)

  router
    .route(`/Task`)
    .post(_auth.addJobGuard, _auth.auditLog, Task.addTask)
    .get(_auth.adminGuard, _auth.auditLog, Task.getTasks)
  router
    .route(`/Task/:id`)
    .put(_auth.addJobGuard, _auth.auditLog, Task.updateTask)
    .get(_auth.adminGuard, _auth.auditLog, Task.getTask)
    .delete(_auth.adminGuard, _auth.auditLog, Task.deleteTask)

  router.put(
    '/Task/complete/:id',
    _auth.adminGuard,
    uploaderSettings,
    _auth.auditLog,
    Task.completeTask
  )

  router
    .route('/schemas')
    .get(_auth.adminGuard, _auth.auditLog, Schemas.getAllSchemas)
  router
    .route('/schemas/:collection')
    .get(_auth.adminGuard, _auth.auditLog, Schemas.getSchemaData)
  router
    .route('/schemas/:collection')
    .put(_auth.adminGuard, Schemas.updateDocument)

  router
    .route('/metadata')
    .post(_auth.adminGuard, _auth.auditLog, Schemas.addMetaData)
    .get(_auth.adminGuard, _auth.auditLog, Schemas.getAllMetaData)

  router
    .route('/metadata/:id')
    .get(_auth.adminGuard, _auth.auditLog, Schemas.getMetaData)
    .put(_auth.adminGuard, _auth.auditLog, Schemas.updateMetaData)
    .delete(_auth.adminGuard, _auth.auditLog, Schemas.deleteMetaData)

  router
    .route('/geolocation')
    .post(_auth.adminGuard, _auth.auditLog, Geolocation.addGeolocation)
    .get(_auth.adminGuard, _auth.auditLog, Geolocation.getGeolocations)
  router
    .route('/geolocation/:id')
    .put(_auth.adminGuard, _auth.auditLog, Geolocation.updateGeolocation)
    .get(_auth.adminGuard, _auth.auditLog, Geolocation.getGeolocation)
    .delete(_auth.adminGuard, _auth.auditLog, Geolocation.deleteGeolocation)

  router.route('/upload').post(uploaderSettings, upload.addUpload)
  router
    .route('/upload/:id')
    .get(upload.getUpload)
    .put(uploaderSettings, upload.updateUpload)
    .delete(upload.deleteUpload)
  router.get('/upload/driver/:driverId', upload.getUploadsByDriver)

  router.route('/billing').post(_auth.auditLog, Billing.create)
  router.route('/billing/:id').get(_auth.auditLog, Billing.downloadPDF)
  router.route('/ping-session').get(async (req, res) => {
    try {
      const rm = await RequestsModel.findOne({ jwtToken: req.token })
      return res.status(200).json({ success: true, data: rm.isExpired })
    } catch (err) {
      return res.status(502).json({ success: false, error: err.message })
    }
  })

  router.route('/ping-time').get(async (req, res) => {
    try {
      return res
        .status(200)
        .json({ success: true, data: settings.server.pingTime })
    } catch (err) {
      return res.status(502).json({ success: false, error: err.message })
    }
  })
  return router
}
