const JobsModel = require(`./models/JobsModel`)
const PastJobModel = require('./models/PastJobsModel')
const DriverModel = require('./models/DriverModel')
const TasksModel = require('./models/TaskModel')
const JobDriverInterModel = require('./models/JobDriverInter')
const QueuedJobModel = require('./models/QueuedJobModel')
const SkippedTasksModel = require('./models/SkippedTasks')
const ChargeTypesModel = require('./models/ChargeTypesModel')
const googleMapService = require('../helpers/GoogleMapService')
const ObjectId = require('mongodb').ObjectID
const dayjs = require('dayjs')
const config = require('../../server-settings.json')
const emailService = require('../helpers/Email')

const controller = {}

controller.addJob = async (req, res) => {
  try {
    const _job = {
      status: 'PENDING',
      estimatedArrival: dayjs(req.body.estimatedArrival).utc(true).toDate(),
      arrived: null,
      customer: req.body.customer,
      department: req.body.department,
      Tasks: req.body.Tasks,
      items: req.body.items,
      Driver: req.body.Driver,
      chargeType: req.body.chargeType,
      createdByUser: req.user._id,
    }

    let chargeType = await ChargeTypesModel.findById(_job.chargeType)
    if (chargeType == null) throw new Error('Charge type is not a valid')

    // If the job is a stat type job
    if (chargeType.name == 'STAT') {
      let job = new JobsModel(_job)
      // Assign nearest stat driver to stat job if the stat job does not have a driver
      if (!job.Driver) {
        let taskId = job.Tasks[0]
        let task = await TasksModel.findById(taskId)
          .populate('addressLocation')
          .exec()
        let jobLocation = task.addressLocation
        let allDrivers = await DriverModel.find({
          driverType: 'STAT',
          on_duty: true,
        })
          .populate('addressLocation')
          .exec()
        let distances = await Promise.all(
          allDrivers.map(async (driver) => {
            try {
              const distance = await googleMapService.estimateDistance(
                jobLocation,
                driver.addressLocation,
                'imperial'
              )
              if (distance) {
                return {
                  driverId: driver._id,
                  distance: distance,
                }
              }
            } catch (ex) {
              return res.status(502).json({ success: false, error: ex.message })
            }
          })
        )

        if (distances.length > 0) {
          //Assign nearest driver to job
          distances = distances.sort(
            (a, b) => parseFloat(a.distance) - parseFloat(b.distance)
          )

          job.Driver = distances[0].driverId
        }
      }

      let _estimatedMiles = null
      if (job.Driver) {
        //Get driver currentlocation
        let driverLocation = await DriverModel.findById(job.Driver)
          .populate('addressLocation')
          .exec()
        driverLocation = driverLocation.addressLocation

        //Get First task location
        let firstTaskLocation = await TasksModel.findById(req.body.Tasks[0])
          .populate('addressLocation')
          .exec()
        firstTaskLocation = firstTaskLocation.addressLocation
        //Get estimateMiles
        _estimatedMiles = await googleMapService.estimateDistance(
          driverLocation,
          firstTaskLocation,
          'imperial'
        )
      } else {
        // For the case when there is no stat driver at all available for this stat job. Convert to queued job

        let qJobObject = {
          customer: _job.customer,
          department: _job.department,
          endTime: _job.estimatedArrival,
          tasks: _job.Tasks,
          chargeType: _job.chargeType,
          items: _job.items,
          createdByUser: _job.createdByUser,
        }

        let qJob = new QueuedJobModel(qJobObject)

        await qJob.save()

        for (let task of qJob.tasks) {
          if (qJob.customer.requiresPhotoSignature) {
            await TasksModel.findByIdAndUpdate(
              task._id,
              { requiresPhotoSignature: qJob.customer.requiresPhotoSignature },
              { new: true, useFindAndModify: false }
            )
          } else {
            if (qJob.department && qJob.department.requiresPhotoSignature) {
              await TasksModel.findByIdAndUpdate(
                task._id,
                {
                  requiresPhotoSignature:
                    qJob.department.requiresPhotoSignature,
                },
                { new: true, useFindAndModify: false }
              )
            }
          }
        }

        qJob = await QueuedJobModel.findById(qJob.id)
          .populate({ path: 'tasks', populate: 'addressLocation' })
          .exec()

        _estimatedMiles = 0
        for (let i = 0; i < qJob.tasks.length - 1; i++) {
          let distanceTemp = await googleMapService.estimateDistance(
            qJob.tasks[i].addressLocation,
            qJob.tasks[i + 1].addressLocation,
            'imperial'
          )
          if (distanceTemp != null) {
            _estimatedMiles += distanceTemp
          } else {
            continue
          }
        }

        qJob.estimatedMiles = _estimatedMiles
        await qJob.save()

        return res.status(200).json({
          success: true,
          data: qJob,
          message: 'No stat driver found so its now converted to a queued job.',
        })
      }

      if (_estimatedMiles == null) {
        throw new Error('Could not estimate distances')
      }

      job.estimatedMiles = _estimatedMiles

      await job.save()

      job = await JobsModel.findById(job.id)
        .populate(['customer', 'department', 'Tasks'])
        .exec()
      for (let task of job.Tasks) {
        if (job.customer.requiresPhotoSignature) {
          await TasksModel.findByIdAndUpdate(
            task._id,
            { requiresPhotoSignature: job.customer.requiresPhotoSignature },
            { new: true, useFindAndModify: false }
          )
        } else {
          if (job.department && job.department.requiresPhotoSignature) {
            await TasksModel.findByIdAndUpdate(
              task._id,
              { requiresPhotoSignature: job.department.requiresPhotoSignature },
              { new: true, useFindAndModify: false }
            )
          }
        }
      }

      return res.status(200).json({
        success: true,
        data: job,
        message: 'Stat job has been created and driver assigned.',
      })
    }

    //If the job does not have a driver turn this into a queued job.
    if (!_job.Driver) {
      let qJobObject = {
        customer: _job.customer,
        department: _job.department,
        endTime: _job.estimatedArrival,
        tasks: _job.Tasks,
        chargeType: _job.chargeType,
        items: _job.items,
        createdByUser: _job.createdByUser,
      }
      let qJob = new QueuedJobModel(qJobObject)
      await qJob.save()

      for (let task of qJob.tasks) {
        if (qJob.customer.requiresPhotoSignature) {
          await TasksModel.findByIdAndUpdate(
            task._id,
            { requiresPhotoSignature: qJob.customer.requiresPhotoSignature },
            { new: true, useFindAndModify: false }
          )
        } else {
          if (qJob.department && qJob.department.requiresPhotoSignature) {
            await TasksModel.findByIdAndUpdate(
              task._id,
              {
                requiresPhotoSignature: qJob.department.requiresPhotoSignature,
              },
              { new: true, useFindAndModify: false }
            )
          }
        }
      }
      return res.status(200).json({
        success: true,
        data: qJob,
        message:
          'Your job was a regular job with no driver so its now converted to a queued job.',
      })
    } else {
      // Else just turn this job into a normal job
      let job = new JobsModel(_job)
      //Get driver currentlocation
      let driverLocation = await DriverModel.findById(job.Driver)
        .populate('addressLocation')
        .exec()
      driverLocation = driverLocation.addressLocation

      //Get First task location
      let firstTaskLocation = await TasksModel.findById(req.body.Tasks[0])
        .populate('addressLocation')
        .exec()
      firstTaskLocation = firstTaskLocation.addressLocation
      //Get estimateMiles

      let _estimatedMiles = await googleMapService.estimateDistance(
        driverLocation,
        firstTaskLocation,
        'imperial'
      )

      if (_estimatedMiles == null) {
        throw new Error('Could not estimate distances')
      }

      job.estimatedMiles = _estimatedMiles

      await job.save()

      job = await JobsModel.findById(job.id)
        .populate(['customer', 'department', 'Tasks'])
        .exec()
      for (let task of job.Tasks) {
        if (job.customer.requiresPhotoSignature) {
          await TasksModel.findByIdAndUpdate(
            task._id,
            { requiresPhotoSignature: job.customer.requiresPhotoSignature },
            { new: true, useFindAndModify: false }
          )
        } else {
          if (job.department && job.department.requiresPhotoSignature) {
            await TasksModel.findByIdAndUpdate(
              task._id,
              { requiresPhotoSignature: job.department.requiresPhotoSignature },
              { new: true, useFindAndModify: false }
            )
          }
        }
      }

      return res.status(200).json({
        success: true,
        data: job,
        message: 'Job created.',
      })
    }

    return res.status(200).json({
      success: true,
      data: null,
      message: 'Job not created, maybe you are missing some data.',
    })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.updateJob = async (req, res) => {
  try {
    let record = await JobsModel.findById(req.params.id)
    let updateObject = {
      status: req.body.status ?? record.status,
      estimatedArrival: dayjs(
        req.body.estimatedArrival ?? record.estimatedArrival
      )
        .utc(true)
        .toDate(),
      customer: req.body.customer ?? record.customer,
      Tasks: req.body.Tasks ?? record.Tasks,
      items: req.body.items ?? record.items,
      Driver: req.body.Driver ?? record.Driver,
      chargeType: req.body.chargeType ?? record.chargeType,
    }

    let job = await JobsModel.findByIdAndUpdate(req.params.id, updateObject, {
      new: true,
      useFindAndModify: false,
    })

    return res.status(200).json({ success: true, data: job })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.rejectJob = async (req, res) => {
  try {
    let job = await JobsModel.findById(req.params.id)
      .populate('chargeType')
      .exec()
    if (job.chargeType.name != 'STAT') {
      throw new Error('This endpoint is for stat jobs only.')
    }

    // Get the job location
    let taskId = job.Tasks[0]
    let task = await TasksModel.findById(taskId)
      .populate('addressLocation')
      .exec()
    let jobLocation = task.addressLocation

    //Get and record the driver that rejected the job.
    let rejectingDriver = new JobDriverInterModel({
      Job: req.params.id,
      Driver: job.Driver,
    })
    await rejectingDriver.save()

    // Get all the stat drivers except for the drivers that already rejected the job.
    let rejectingDrivers = await JobDriverInterModel.find({
      Job: req.params.id,
    })
    let rejectingDriverIds = rejectingDrivers.map((x) => new ObjectId(x.Driver))
    let allStatDrivers = await DriverModel.find({
      driverType: 'STAT',
      on_duty: true,
      _id: { $nin: rejectingDriverIds },
    })
      .populate('addressLocation')
      .exec()

    //Case when all stat drivers have rejected the job. This is where we convert to queued job.
    if (allStatDrivers.length < 1) {
      let qJobObject = {
        customer: job.customer,
        department: job.department,
        endTime: job.estimatedArrival,
        tasks: job.Tasks,
        chargeType: job.chargeType,
        items: job.items,
        createdByUser: job.createdByUser,
      }
      let qJob = new QueuedJobModel(qJobObject)
      await qJob.save()
      await JobDriverInterModel.deleteMany({ Job: req.params.id })
      await JobsModel.findByIdAndDelete(req.params.id, {
        useFindAndModify: false,
      })
      return res.status(200).json({
        success: true,
        data: qJob,
      })
    }

    let distances = await Promise.all(
      allStatDrivers.map(async (driver) => {
        try {
          const distance = await googleMapService.estimateDistance(
            jobLocation,
            driver.addressLocation,
            'imperial'
          )
          if (distance) {
            return {
              driverId: driver._id,
              distance: distance,
            }
          }
        } catch (err) {
          return res.status(502).json({ success: false, error: err.message })
        }
      })
    )

    if (distances.length > 0) {
      //Assign nearest driver to job
      distances = distances.sort(
        (a, b) => parseFloat(a.distance) - parseFloat(b.distance)
      )
      job.Driver = distances[0].driverId
      job = await job.save()
    }

    return res.status(200).json({
      success: true,
      data: job,
    })
  } catch (error) {
    return res.status(502).json({
      success: false,
      error: error.message,
    })
  }
}

controller.getPendingStatJobs = async (req, res) => {
  try {
    let pendingStatJobs = await JobsModel.find()
      .populate([
        'createdByUser',
        'chargeType',
        { path: 'customer', populate: 'uploads' },
        { path: 'Driver', populate: 'uploads' },
        {
          path: 'Tasks',
          populate: ['customerID', 'department', 'addressLocation'],
        },
      ])
      .exec()

    pendingStatJobs = pendingStatJobs.filter(
      (job) => job.chargeType.name == 'STAT'
    )

    return res.status(200).json({
      success: true,
      data: pendingStatJobs,
    })
  } catch (error) {
    return res.status(502).json({
      success: false,
      error: error.message,
    })
  }
}

controller.acceptJob = async (req, res) => {
  try {
    let job = await JobsModel.findByIdAndUpdate(
      req.params.id,
      { start_time: Date.now(), status: 'ACCEPTED' },
      { useFindAndModify: false }
    )
    await JobDriverInterModel.deleteMany({ Job: req.params.id })

    let driver = await DriverModel.findById(job.Driver)

    driver.jobTrackingId = job.id
    // Set any previous task to pending
    if (driver.taskTrackingId) {
      await TasksModel.findByIdAndUpdate(
        driver.taskTrackingId,
        { status: 'PENDING' },
        { useFindAndModify: false }
      )
    }

    if (req.query.task && !job.Tasks.includes(req.query.task)) {
      throw new Error('Task not valid')
    }

    driver.taskTrackingId = req.query.task ? req.query.task : job.Tasks[0]

    await TasksModel.findByIdAndUpdate(
      driver.taskTrackingId,
      { status: 'ACCEPTED', trackingTime: Date.now() },
      { useFindAndModify: false }
    )

    await driver.save()

    return res.status(200).json({
      success: true,
      data: 'Job accepted.',
    })
  } catch (ex) {
    return res.status(502).json({
      success: false,
      error: ex.message,
    })
  }
}

controller.getJob = async (req, res) => {
  try {
    const job = await JobsModel.findById(req.params.id)
      .populate([
        'createdByUser',
        'chargeType',
        { path: 'customer', populate: 'uploads' },
        { path: 'Driver', populate: 'uploads' },
        {
          path: 'Tasks',
          populate: ['customerID', 'department', 'addressLocation'],
        },
      ])
      .exec()

    if (job == null) throw new Error('Job does not exist')

    return res.status(200).json({ success: true, data: job })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.getJobs = async (req, res) => {
  try {
    const job = await JobsModel.find()
      .populate([
        'createdByUser',
        'chargeType',
        { path: 'customer', populate: 'uploads' },
        { path: 'Driver', populate: 'uploads' },
        {
          path: 'Tasks',
          populate: ['customerID', 'department', 'addressLocation'],
        },
      ])
      .exec()
    return res.status(200).json({ success: true, data: job })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.skipTask = async (req, res) => {
  try {
    const job = await JobsModel.findById(req.params.jobId)
      .populate(['chargeType', 'Driver'])
      .exec()
    if (job.chargeType.name !== 'ROUTE')
      throw new Error('This job does not have charge type ROUTE')

    if (job.Driver.taskTrackingId == req.params.taskId) {
      await DriverModel.findByIdAndUpdate(
        job.Driver.id,
        { taskTrackingId: null },
        { useFindAndModify: false }
      )
    }

    const task = await TasksModel.findById(req.params.taskId)
    task.status = 'CANCELLED'
    await task.save()
    const _skippedTask = {
      Task: task._id,
      Driver: job.Driver.id,
    }
    const isAlreadySkipped = await SkippedTasksModel.findOne({
      Task: _skippedTask.Task,
      Driver: _skippedTask.Driver,
    })

    if (isAlreadySkipped != null)
      throw new Error(`You already skipped this task`)

    const skippedTask = new SkippedTasksModel(_skippedTask)
    await skippedTask.save()
    const skippedTaskIndex = job.Tasks.indexOf(task._id)

    if (skippedTaskIndex + 1 > job.Tasks.length - 1) {
      job.Tasks = job.Tasks.filter((tid) => tid != task.id)
      await job.save()
      throw new Error(`No other tasks left`)
    }

    const nextTaskId = job.Tasks[skippedTaskIndex + 1]
    const nextTask = await TasksModel.findById(nextTaskId)
    job.customer = nextTask.customerID
    job.Tasks = job.Tasks.filter((tid) => tid != task.id)
    await job.save()
    return res.status(200).json({
      success: true,
      data: { job, task },
      message: `Task skipped.`,
    })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.deleteJob = async (req, res) => {
  try {
    let job = await JobsModel.findById(req.params.id)
    job = await job.remove()
    return res.status(200).json({ success: true, data: job })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.completeJob = async (req, res) => {
  try {
    let job = await JobsModel.findById(req.params.id)
      .populate([
        'chargeType',
        { path: 'Driver', populate: ['addressLocation'] },
        {
          path: 'Tasks',
          populate: ['department', 'customerID', 'upload', 'addressLocation'],
        },
      ])
      .exec()

    if (job.status == 'CANCELLED') {
      throw new Error('This job was cancelled.')
    }

    //Process whether all tasks are complete with required rules fulfilled
    //Just mark tasks complete or pending on the basis of requirments
    let allTasksComplete = true
    for (let task of job.Tasks) {
      // Check whether task requires photoproof

      if (task.requiresPhotoSignature) {
        if (task.upload) {
          if (task.department?.departmentEmail) {
            let sigInfo = task.upload.signatureUrls.concat(
              task.upload.photoUrls,
              task.upload.attachmentUrls
            )
            const attachments = sigInfo.map((x) => {
              return { path: x }
            })
            const driverName = job.Driver.name
            const jobId = job.id
            attachments.push({
              filename: 'Logo.png',
              path: 'Logo.png',
              cid: 'logo',
            })
            const css = `
            table {
              font-family: arial, sans-serif;
              border-collapse: collapse;
              width: 100%;
            }
    
            td, th {
              border: 1px solid #dddddd;
              text-align: left;
              padding: 8px;
            }
    
            img {
              width: 200px;
              height: 100px;
            }
    
            p {
              text-align: center;
            }
            `
            let htmlString = `
            <html>
            <head>
            <style>${css}</style>
            </head>
            <body>
              <p>
                <img src="cid:logo">
              </p>
              <table>
                  <tr>
                    <th>Driver Name</th>
                    <td>${driverName}</td>
                  </tr>
                  <tr>
                    <th>Job ID</th>
                    <td>${jobId}</td>
                  </tr>
                  <tr>
                    <th>Location</th>
                    <td>
                      ${task.addressLocation.Latitude}, ${task.addressLocation.Longitude}
                    </td>
                  </tr>
              </table>
  
            </body>
            </html>`
            emailService.sendEmail({
              to: task.department?.departmentEmail,
              subject: `Signature info for job ${jobId}`,
              text: `Please check attachments`,
              html: htmlString,
              attachments: attachments,
            })
          }
        } else {
          allTasksComplete = false
        }
      }
    }

    //All tasks need to be complete before we mark a job as complete. Throws error if even one task is marked pending.
    if (!allTasksComplete) {
      throw new Error(
        'Some tasks in your job require photoproof. Please add them first'
      )
    }

    let driverLocation = job.Driver.addressLocation
    let destinationLocation = job.Tasks[job.Tasks.length - 1].addressLocation
    let distance = await googleMapService.estimateDistance(
      driverLocation,
      destinationLocation,
      'imperial'
    )
    if (distance == null) {
      throw new Error('Bad location')
    }
    distance = distance * 3.28
    if (distance > config.server.GoogleCheckinDistance) {
      job.status = 'PENDING'
      await job.save()
      throw new Error('Too far from the job destination')
    }

    job.status = 'COMPLETE'
    await job.save()
    let pastJob = new PastJobModel()
    pastJob.status = 'COMPLETE'
    pastJob.estimatedArrival = job.estimatedArrival
    pastJob.start_time = job.start_time
    pastJob.endDate = Date.now()
    pastJob.estimatedMiles = job.estimatedMiles
    pastJob.distanceTravelled = job.distanceTravelled
    pastJob.customer = job.customer
    pastJob.department = job.department

    pastJob.driverIncome =
      job.Tasks.length * job.chargeType.stop_rate +
      (job.distanceTravelled ?? 0) * job.chargeType.mileage_rate

    pastJob.driverIncome = pastJob.driverIncome * job.Driver.commission

    pastJob.Tasks = job.Tasks
    pastJob.items = job.items
    pastJob.chargeType = job.chargeType
    pastJob.Driver = job.Driver
    pastJob.createdByUser = job.createdByUser
    await pastJob.save()
    await job.remove()

    return res.status(200).json({
      success: true,
      data: pastJob,
      message: 'job converted to past job',
    })
  } catch (ex) {
    return res.status(502).json({ success: false, message: ex.message })
  }
}

controller.cancelJob = async (req, res) => {
  try {
    let job = await JobsModel.findById(req.params.id)
    job.status = 'CANCELLED'
    await job.save()

    //Convert job to pastjob and delete the job
    let pastJob = new PastJobModel()
    pastJob.status = 'CANCELLED'
    pastJob.estimatedArrival = job.estimatedArrival
    pastJob.start_time = job.start_time
    pastJob.endDate = Date.now()
    pastJob.estimatedMiles = job.estimatedMiles
    pastJob.distanceTravelled = job.distanceTravelled
    pastJob.customer = job.customer
    pastJob.department = job.department
    pastJob.Tasks = job.Tasks
    pastJob.items = job.items
    pastJob.chargeType = job.chargeType
    pastJob.Driver = job.Driver
    pastJob.createdByUser = job.createdByUser
    await pastJob.save()
    await job.remove()
    return res.status(200).json({
      success: true,
      data: pastJob,
      message: 'job converted to past job',
    })
  } catch (ex) {
    return res.status(502).json({ success: false, message: ex.message })
  }
}

module.exports = controller
