const DriverModel = require(`./models/DriverModel`)
const GeolocationModel = require(`./models/GeolocationModel`)
const UploadsModel = require('./models/UploadsModel')
const JobsModel = require('./models/JobsModel')
const TaskModel = require('./models/TaskModel')
const PastJobModel = require('./models/PastJobsModel')
const googleMapService = require('../helpers/GoogleMapService')
const config = require('../../server-settings.json')
const controller = {}

controller.addDriver = async (req, res) => {
  try {
    const _driver = {
      date_of_birth: req.body.date_of_birth,
      current_license_number: req.body.current_license_number,
      home_address: req.body.home_address,
      bank_name: req.body.bank_name,
      driverType: req.body.driverType,
      account_title: req.body.account_title,
      account_number: req.body.account_number,
      iban_number: req.body.iban_number,
      routing_number: req.body.routing_number,
      commission: req.body.commission,
      on_duty: req.body.on_duty,
      userId: req.body.userId,
    }

    const _addressLocation = {
      Latitude: req.body.addressLocation?.Latitude,
      Longitude: req.body.addressLocation?.Longitude,
    }

    const addressLocation = new GeolocationModel(_addressLocation)

    let driver = new DriverModel(_driver)
    driver.addressLocation = addressLocation._id

    // await user.save()
    await addressLocation.save()
    await driver.save()

    const { signatures, photos, attachments } = req.files
    const _upload = {
      signatureUrls: signatures?.map((x) => x.path),
      photoUrls: photos?.map((x) => x.path),
      attachmentUrls: attachments?.map((x) => x.path),
    }

    const upload = new UploadsModel(_upload)
    await upload.save()
    driver.uploads = upload.id
    await driver.save()

    driver = await DriverModel.findById(driver.id)
      .populate(['addressLocation', 'uploads', 'userId'])
      .exec()

    return res.status(200).json({ success: true, data: { driver } })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.updateDriver = async (req, res) => {
  try {
    let record = await DriverModel.findById(req.params.id)
      .populate(['addressLocation', 'uploads'])
      .exec()
    const updateDriver = {
      date_of_birth: req.body.date_of_birth ?? record.date_of_birth,
      current_license_number:
        req.body.current_license_number ?? record.current_license_number,
      home_address: req.body.home_address ?? record.home_address,
      bank_name: req.body.bank_name ?? record.bank_name,
      driverType: req.body.driverType ?? record.driverType,
      account_title: req.body.account_title ?? record.account_title,
      account_number: req.body.account_number ?? record.account_number,
      iban_number: req.body.iban_number ?? record.iban_number,
      routing_number: req.body.routing_number ?? record.routing_number,
      commission: req.body.commission ?? record.commission,
      on_duty: req.body.on_duty ?? record.on_duty,
      userId: req.body.userId ?? record.userId,
    }
    req.body.addressLocation = req.body.addressLocation ?? {
      Latitude: record.addressLocation.Latitude,
      Longitude: record.addressLocation.Longitude,
    }

    const _addressLocation = {
      Latitude: req.body.addressLocation.Latitude,
      Longitude: req.body.addressLocation.Longitude,
    }
    let driver = await DriverModel.findByIdAndUpdate(
      req.params.id,
      updateDriver,
      { new: true, useFindAndModify: false }
    )
      .populate('addressLocation')
      .exec()

    const _upload = {
      signatureUrls:
        req.files['signatures']?.map((x) => x.path) ??
        record.uploads.signatureUrls,
      photoUrls:
        req.files['photos']?.map((x) => x.path) ?? record.uploads.photoUrls,
      attachmentUrls:
        req.files['attachments']?.map((x) => x.path) ??
        record.uploads.attachmentUrls,
    }
    await UploadsModel.findByIdAndUpdate(record.uploads.id, _upload, {
      new: true,
      useFindAndModify: false,
    })

    let distanceTravelledPart = 0
    let driverPrevLocation = driver.addressLocation

    let driverCurrLocation = req.body.addressLocation
    // Get distance travelled by the driver
    if (driverPrevLocation.Latitude && driverPrevLocation.Longitude) {
      distanceTravelledPart = await googleMapService.estimateDistance(
        driverPrevLocation,
        driverCurrLocation,
        'imperial'
      )
    }

    //Geolocation update for driver
    await GeolocationModel.findByIdAndUpdate(
      driver.addressLocation.id,
      _addressLocation,
      { new: true, useFindAndModify: false }
    )

    let activeJob = await JobsModel.findOne({
      Driver: req.params.id,
    })
      .populate({
        path: 'Tasks',
        populate: ['department', 'customerID', 'addressLocation'],
      })
      .exec()
    if (activeJob != null) {
      activeJob.estimatedMiles -= distanceTravelledPart
      //Update distance travelled for job
      if (activeJob.distanceTravelled) {
        activeJob.distanceTravelled += distanceTravelledPart
        await activeJob.save()
      } else {
        activeJob.distanceTravelled = distanceTravelledPart
        await activeJob.save()
      }
      //Check whether job requires photoproof
      let requiresPhotoSignature = false
      for (const task of activeJob.Tasks) {
        if (task.requiresPhotoSignature) break
        else
          await TaskModel.findByIdAndUpdate(
            task.id,
            { status: 'COMPLETE' },
            { useFindAndModify: false }
          )
      }

      //No auto checkin allowed for jobs that require photo signature.
      if (!requiresPhotoSignature) {
        // Check whether driver is has arrived at the destination. Driver autocheckin.
        let destinationTask = activeJob.Tasks[activeJob.Tasks.length - 1]

        let distance = null
        distance = await googleMapService.estimateDistance(
          driver.addressLocation,
          destinationTask.addressLocation,
          'imperial'
        )
        distance = distance * 3.28

        if (distance < config.server.GoogleCheckinDistance) {
          await JobsModel.findByIdAndUpdate(
            activeJob._id,
            {
              status: 'COMPLETE',
              arrived: Date.now(),
            },
            { useFindAndModify: false }
          )

          let pastJob = new PastJobModel()
          pastJob.status = 'COMPLETE'
          pastJob.estimatedArrival = activeJob.estimatedArrival
          pastJob.start_time = activeJob.start_time
          pastJob.endDate = Date.now()
          pastJob.estimatedMiles = activeJob.estimatedMiles
          pastJob.distanceTravelled = activeJob.distanceTravelled
          pastJob.customer = activeJob.customer
          pastJob.Tasks = activeJob.Tasks
          pastJob.items = activeJob.items
          pastJob.chargeType = activeJob.chargeType
          pastJob.Driver = activeJob.Driver
          pastJob.createdByUser = activeJob.createdByUser
          await pastJob.save()
          await activeJob.remove()
        } else {
          await JobsModel.findByIdAndUpdate(
            activeJob._id,
            {
              status: 'PENDING',
              arrived: null,
            },
            { useFindAndModify: false }
          )
        }
      }
    }

    driver = await DriverModel.findById(driver.id)
      .populate(['addressLocation', 'uploads', 'userId'])
      .exec()

    return res.status(200).json({ success: true, data: driver })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.getDriver = async (req, res) => {
  try {
    let driver = await DriverModel.findById(req.params.id)
      .populate(['userId', 'addressLocation', 'uploads'])
      .exec()
    if (driver == null) {
      driver = await DriverModel.findOne({ userId: req.params.id })
        .populate(['userId', 'addressLocation', 'uploads'])
        .exec()
    }

    return res.status(200).json({ success: true, data: driver })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

controller.getDrivers = async (req, res) => {
  try {
    let filter = {}
    if (req.query.on_duty) {
      filter.on_duty = req.query.on_duty
    }
    const drivers = await DriverModel.find(filter)
      .populate(['userId', 'addressLocation', 'uploads'])
      .exec()
    return res.status(200).json({ success: true, data: drivers })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

controller.getOnlineDrivers = async (req, res) => {
  try {
    const drivers = await DriverModel.find({ on_duty: true })
      .populate(['userId', 'addressLocation', 'uploads'])
      .exec()
    return res.status(200).json({ success: true, data: drivers })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

controller.deleteDriver = async (req, res) => {
  try {
    const driver = await DriverModel.findById(req.params.id)
    await driver.remove()
    return res.status(200).json({ success: true, data: driver })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

module.exports = controller
