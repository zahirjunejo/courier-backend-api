const QueuedJobModel = require(`./models/QueuedJobModel`)
const JobsModel = require('./models/JobsModel')
const DriversModel = require('./models/DriverModel')
const UsersModel = require('./models/UsersModel')
const googleMapService = require('../helpers/GoogleMapService')
const Pusher = require('pusher')
const dayjs = require('dayjs')
const controller = {}

controller.addQueuedJob = async (req, res) => {
  try {
    const _queuedJob = {
      department: req.body.department,
      customer: req.body.customer,
      startTime: dayjs(req.body.startTime).utc(true).toDate(),
      endTime: dayjs(req.body.endTime).utc(true).toDate(),
      tasks: req.body.tasks,
      chargeType: req.body.chargeType,
      items: req.body.items,
      createdByUser: req.user._id,
    }
    const queuedJob = new QueuedJobModel(_queuedJob)
    await queuedJob.save()

    const pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_APP_KEY,
      secret: process.env.PUSHER_APP_SECRET,
      cluster: process.env.PUSHER_APP_CLUSTER,
    })

    const admins = await UsersModel.find({
      roles: 'admin',
    })

    await Promise.all(
      admins.map(async (admin) => {
        await pusher.trigger(
          'my-channel',
          admin._id,
          queuedJob,
          req.headers['x-socket-id']
        )

        return null
      })
    )

    return res.status(200).json({ success: true, data: { queuedJob } })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.updateQueuedJob = async (req, res) => {
  try {
    let record = await QueuedJobModel.findById(req.params.id)
    const _queuedJob = {
      department: req.body.department ?? record.department,
      customer: req.body.customer ?? record.customer,
      startTime: req.body.startTime
        ? dayjs(req.body.startTime).utc(true).toDate()
        : record.startTime,
      endTime: req.body.endTime
        ? dayjs(req.body.endTime).utc(true).toDate()
        : record.endTime,
      tasks: req.body.tasks ?? record.tasks,
      chargeType: req.body.chargeType ?? record.chargeType,
      items: req.body.items ?? record.items,
    }

    const queuedJob = await QueuedJobModel.findByIdAndUpdate(
      req.params.id,
      _queuedJob,
      { new: true, useFindAndModify: false }
    )

    return res.status(200).json({ success: true, data: { queuedJob } })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

//Convert queuedjob to job
controller.ToJob = async (req, res) => {
  try {
    const queuedJob = await QueuedJobModel.findById(req.params.id)
      .populate({
        path: 'tasks',
        populate: 'addressLocation',
      })
      .exec()
    let jobObject = {
      status: 'PENDING',
      customer: queuedJob.customer,
      department: queuedJob.department,
      estimatedArrival: queuedJob.endTime,
      Tasks: queuedJob.tasks,
      start_time: queuedJob.startTime,
      chargeType: queuedJob.chargeType,
      Driver: req.params.driverId,
      items: queuedJob.items,
      createdByUser: queuedJob.createdByUser,
    }

    //Estimate distance miles between driver and destination
    let driverLocation = await DriversModel.findById(req.params.driverId)
      .populate('addressLocation')
      .exec()

    if (!driverLocation.on_duty) {
      throw new Error('This driver is offline')
    }

    driverLocation = driverLocation.addressLocation

    let distance = await googleMapService.estimateDistance(
      driverLocation,
      queuedJob.tasks[0].addressLocation,
      'imperial'
    )
    jobObject.estimatedMiles = distance

    let job = new JobsModel(jobObject)
    job = await job.save()

    await queuedJob.remove()

    return res.status(200).json({ success: true, data: job })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.getQueuedJob = async (req, res) => {
  try {
    const qj = await QueuedJobModel.findById(req.params.id)
      .populate([
        { path: 'customer', populate: 'uploads' },
        'chargeType',
        {
          path: 'tasks',
          populate: ['addressLocation', 'customerID', 'department'],
        },
      ])
      .exec()

    return res.status(200).json({ success: true, data: qj })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.getQueuedJobs = async (req, res) => {
  try {
    const qjs = await QueuedJobModel.find()
      .populate([
        { path: 'customer', populate: 'uploads' },
        'chargeType',
        {
          path: 'tasks',
          populate: ['addressLocation', 'customerID', 'department'],
        },
      ])
      .exec()

    return res.status(200).json({ success: true, data: qjs })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.deleteQueuedJob = async (req, res) => {
  try {
    let qj = await QueuedJobModel.findById(req.params.id)

    qj = await qj.remove()

    return res.status(200).json({ success: true, data: qj })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}
module.exports = controller
