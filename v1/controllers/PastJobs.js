const pastjobsmodel = require(`./models/PastJobsModel`)
const chargetypesmodel = require('./models/ChargeTypesModel')
const taskmodel = require('./models/TaskModel')
const geolocationmodel = require('./models/GeolocationModel')
const dayjs = require('dayjs')
const payout = require('../helpers/GeneratePayout')
const controller = {}

controller.addpastJob = async (req, res) => {
  try {
    const _pastjob = {
      status: req.body.status,
      estimatedArrival: dayjs(req.body.estimatedArrival).utc(true).toDate(),
      estimatedMiles: req.body.estimatedMiles,
      distanceTravelled: req.body.distanceTravelled,
      customer: req.body.customer,
      department: req.body.department,
      start_time: dayjs(req.body.start_time).utc(true).toDate(),
      Tasks: req.body.Tasks,
      items: req.body.items,
      endDate: null,
      Driver: req.body.Driver,
      driverIncome: req.body.driverIncome,
      chargeType: req.body.chargeType,
    }
    const pastjob = new pastjobsmodel(_pastjob)
    await pastjob.save()
    return res.status(200).json({ success: true, data: pastjob })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.updatepastJob = async (req, res) => {
  try {
    let pj = await pastjobsmodel.findById(req.params.id)
    let updateObject = {
      status: req.body.status ?? pj.status,
      estimatedArrival: req.body.estimatedArrival
        ? dayjs(req.body.estimatedArrival).utc(true).toDate()
        : pj.estimatedArrival,
      estimatedMiles: req.body.estimatedMiles ?? pj.estimatedMiles,
      distanceTravelled: req.body.distanceTravelled ?? pj.distanceTravelled,
      start_time: req.body.start_time
        ? dayjs(req.body.start_time).utc(true).toDate()
        : pj.start_time,
      customer: req.body.customer ?? pj.customer,
      Tasks: req.body.Tasks ?? pj.Tasks,
      items: req.body.items ?? pj.items,
      driverIncome: req.body.driverIncome ?? pj.driverIncome,
      Driver: req.body.Driver ?? pj.Driver,
      chargeType: req.body.chargeType ?? pj.chargeType,
    }

    let pastjob = await pastjobsmodel.findByIdAndUpdate(
      req.params.id,
      updateObject,
      { new: true, useFindAndModify: false }
    )

    if (!pastjob.endDate) {
      updateObject.endDate = dayjs(req.body.estimatedArrival).utc(true).toDate()
      pastjob = await pastjobsmodel.findByIdAndUpdate(
        req.params.id,
        updateObject,
        { new: true, useFindAndModify: false }
      )
    }

    return res.status(200).json({ success: true, data: pastjob })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.getpastJob = async (req, res) => {
  try {
    const pastjob = await pastjobsmodel
      .findById(req.params.id)
      .populate([
        'createdByUser',
        'chargeType',
        'customer',
        'Driver',
        {
          path: 'Tasks',
          populate: ['customerID', 'department', 'addressLocation'],
        },
      ])
      .exec()

    return res.status(200).json({ success: true, data: pastjob })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.getallpastJob = async (req, res) => {
  try {
    let pastjobs
    if (!req.query.from || !req.query.to) {
      pastjobs = await pastjobsmodel
        .find()
        .populate([
          'createdByUser',
          'chargeType',
          'customer',
          'Driver',
          {
            path: 'Tasks',
            populate: ['customerID', 'department', 'addressLocation'],
          },
        ])
        .exec()
    } else {
      pastjobs = await pastjobsmodel
        .find({
          endDate: {
            $gte: dayjs(req.query.from).utc(true).startOf('day').toDate(),
            $lte: dayjs(req.query.to).utc(true).endOf('day').toDate(),
          },
        })
        .populate([
          'createdByUser',
          'chargeType',
          'customer',
          'Driver',
          {
            path: 'Tasks',
            populate: ['customerID', 'department', 'addressLocation'],
          },
        ])
        .exec()

      if (req.query.billing) {
        pastjobs = await pastjobsmodel
          .find({
            endDate: {
              $gte: dayjs(req.query.from).utc(true).startOf('day').toDate(),
              $lte: dayjs(req.query.to).utc(true).endOf('day').toDate(),
            },
            status: 'COMPLETE',
          })
          .populate([
            'Driver',
            'chargeType',
            'customer',
            'department',
            {
              path: 'Tasks',
              populate: ['addressLocation'],
            },
          ])
          .exec()
        let generate_payout = payout.generate(pastjobs, req.query.isDriver)
        return res.status(200).json({ success: true, data: generate_payout })
      }
    }
    return res.status(200).json({ success: true, data: pastjobs })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.pastJobSeed = async (req, res) => {
  try {
    let endDates = []
    for (let day = 11; day <= 25; day++) {
      let endDate = `2022-01-${day}`
      endDates.push(endDate)
    }

    let allChargeTypes = await chargetypesmodel.find()
    let hours = []
    for (let hour = 0; hour < 24; hour++) {
      hours.push(String(hour).padStart(2, '0'))
    }
    let pastjobs = []
    for (const endDate of endDates) {
      for (const hour of hours) {
        for (const chargeType of allChargeTypes) {
          let tasks = []

          for (let i = 0; i < 2; i++) {
            const _task = {
              status: 'COMPLETE',
              address: 'seed address',
              contact: 'seed contact',
              extraNotes: 'seed notes',
              facility: 'seed facility',
              chargeType: chargeType.id,
              isPickup: true,
            }
            const _addressLocation = {
              Latitude: Math.floor(Math.random() * 90) + 1,
              Longitude: Math.floor(Math.random() * 90) + 1,
            }

            const addressLocation = new geolocationmodel(_addressLocation)

            const task = new taskmodel(_task)

            task.addressLocation = addressLocation._id
            await addressLocation.save()
            await task.save()
            tasks.push(task.id)
          }

          const _pastjob = {
            status: 'COMPLETE',
            estimatedArrival: dayjs(endDate).utc(true).toDate(),
            estimatedMiles: '255',
            distanceTravelled: 200,
            customer: '62383d0f8fcffd27cc1d787a',
            start_time: dayjs(`${endDate} ${hour}:00`, 'YYYY-MM-DD HH:mm')
              .utc(true)
              .toDate(),
            Tasks: tasks,
            items: [],
            endDate: dayjs(endDate).utc(true).toDate(),
            Driver: '623862e9bd180e359477eb12',
            chargeType: chargeType.id,
            createdByUser: '6238788ef7d7de0f4831e5bf',
          }
          const pastjob = new pastjobsmodel(_pastjob)
          await pastjob.save()
          pastjobs.push(pastjob)
        }
      }
    }

    return res.status(200).json({ success: true, data: pastjobs })
  } catch (ex) {
    return res.status(502).json({ success: false, message: ex.message })
  }
}

controller.deletepastJob = async (req, res) => {
  try {
    let pastjob = await pastjobsmodel.findById(req.params.id)

    pastjob = await pastjob.remove()

    return res.status(200).json({ success: true, data: pastjob })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

module.exports = controller
