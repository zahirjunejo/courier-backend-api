const GeolocationModel = require(`./models/GeolocationModel`)
const CachedGeolocationModel = require('./models/CachedGeolocations')
const DriversModel = require('./models/DriverModel')
const JobModel = require('./models/JobsModel')
const TaskModel = require('./models/TaskModel')
const CustomersModel = require('./models/CustomerModel')
const Usermodel = require('./models/UsersModel')
const RequestsModel = require('./models/RequestRecord')
const googleMapService = require('../helpers/GoogleMapService')
const controller = {}

controller.estimateDistance = async (req, res) => {
  try {
    // Check with cache
    let cache = await CachedGeolocationModel.findOne({
      originLat: req.body.locations.origin.Latitude,
      originLon: req.body.locations.origin.Longitude,
      destinationLat: req.body.locations.destination.Latitude,
      destinationLon: req.body.locations.destination.Longitude,
    })

    if (cache != null) {
      return res
        .status(200)
        .json({ success: true, distance: cache.estimatedDistance })
    }

    //Check distance
    const distance = await googleMapService.estimateDistance(
      req.body.locations.origin,
      req.body.locations.destination,
      'imperial'
    )

    if (distance) {
      // Save to cache
      let CachedGeolocation = new CachedGeolocationModel()
      CachedGeolocation.originLat = req.body.locations.origin.Latitude
      CachedGeolocation.originLon = req.body.locations.origin.Longitude
      CachedGeolocation.destinationLat = req.body.locations.destination.Latitude
      CachedGeolocation.destinationLon =
        req.body.locations.destination.Longitude
      CachedGeolocation.estimatedDistance = distance
      await CachedGeolocation.save()
    } else {
      throw new Error('Please check your coordinates again.')
    }

    return res
      .status(200)
      .json({ success: true, message: 'Success', data: distance })
  } catch (ex) {
    console.log(ex)
    return res.status(502).json({ success: false, message: ex.message })
  }
}

controller.updateGeolocationById = async (req, res) => {
  try {
    let update = req.body

    let user = await Usermodel.findById(update.user_id)

    let session = await RequestsModel.findOne({ userId: user.id })

    if (session) {
      session.lastReq = Date.now()
      await session.save()
    }

    let updateCoords = {
      Longitude: update.location.coords.longitude,
      Latitude: update.location.coords.latitude,
    }

    let geolocation = null

    if (user.roles.includes('driver')) {
      let driver = await DriversModel.findOne({ userId: user.id })
        .populate('addressLocation')
        .exec()
      if (driver.addressLocation) {
        if (
          driver.addressLocation.Latitude &&
          driver.addressLocation.Longitude
        ) {
          let distanceTravelled = await googleMapService.estimateDistance(
            driver.addressLocation,
            updateCoords,
            'imperial'
          )

          if (driver.jobTrackingId) {
            let trackedJob = await JobModel.findById(driver.jobTrackingId)
            trackedJob.estimatedMiles -= distanceTravelled
            trackedJob.distanceTravelled += distanceTravelled
            await trackedJob.save()
          }

          if (driver.taskTrackingId) {
            let trackedTask = await TaskModel.findById(driver.taskTrackingId)
            trackedTask.estimatedMiles -= distanceTravelled
            trackedTask.distanceTravelled += distanceTravelled
            await trackedTask.save()
          }
        }

        geolocation = await GeolocationModel.findByIdAndUpdate(
          driver.addressLocation.id,
          updateCoords,
          { new: true, useFindAndModify: false }
        )
      } else {
        geolocation = new GeolocationModel(updateCoords)
        await geolocation.save()
      }
    }

    if (user.roles.includes('customer')) {
      let customer = await CustomersModel.findOne({ userId: user.id })
      if (customer.addressLocation) {
        geolocation = await GeolocationModel.findByIdAndUpdate(
          customer.addressLocation,
          updateCoords,
          { new: true, useFindAndModify: false }
        )
      }
    }

    return res.status(200).json({ success: true, data: geolocation })
  } catch (ex) {
    return res.status(502).json({ success: false, message: ex.message })
  }
}

//add a geolocation
// post request
controller.addGeolocation = async (req, res) => {
  try {
    //Form geolocation object from request body
    const _geoLocation = {
      Longitude: req.body.Longitude,
      Latitude: req.body.Latitude,
    }

    // Convert json object to geolocationmodel document
    let geoLocation = new GeolocationModel(_geoLocation)
    geoLocation = await geoLocation.save()

    //Return success response to frontend
    return res.status(200).json({
      success: true,
      data: geoLocation,
    })
  } catch (error) {
    // In case of error return the error message and status to frontend
    return res.status(502).json({
      success: false,
      error: error.message,
    })
  }
}

// Edit a geolocation
// Put request
// Needs a geolocation id
controller.updateGeolocation = async (req, res) => {
  try {
    //Form geolocation update object from request body
    const _geoLocation = {
      Longitude: req.body.Longitude,
      Latitude: req.body.Latitude,
    }

    // Use request object to update GeolocationModel document
    let geoLocation = await GeolocationModel.findByIdAndUpdate(
      req.params.id,
      _geoLocation,
      { new: true, useFindAndModify: false }
    )
    // Return success message to user
    return res.status(200).json({
      success: true,
      data: geoLocation,
    })
  } catch (error) {
    // In case of error, return error message and error status to frontend
    return res.status(502).json({
      success: false,
      error: error.message,
    })
  }
}

// Retrieve a geolocation
// Get request
// Geolocation id is needed
controller.getGeolocation = async (req, res) => {
  try {
    //Uses geolocation id passed in the request paramters to retrieve the geolocation document
    let geoLocation = await GeolocationModel.findById(req.params.id)

    // Return success status and geolocation document object to user
    return res.status(200).json({
      success: true,
      data: geoLocation,
    })
  } catch (error) {
    //In case of error, sends error status and error message
    return res.status(502).json({
      success: false,
      error: error.message,
    })
  }
}

// Retrieve all geolocations
controller.getGeolocations = async (req, res) => {
  try {
    // Gets all the geolocations in a document array form
    let geoLocations = await GeolocationModel.find()

    // Send success status and all retrieved geolocations to end user
    return res.status(200).json({
      success: true,
      data: geoLocations,
    })
  } catch (error) {
    //In case of error, return error status and message
    return res.status(502).json({
      success: false,
      error: error.message,
    })
  }
}

controller.Roads = async (req, res) => {
  try {
    //Check distance
    const distance = await googleMapService.roads(
      req.body.locations.origin,
      req.body.locations.destination,
      'imperial'
    )

    return res
      .status(200)
      .json({ success: true, message: 'Success', data: distance })
  } catch (ex) {
    console.log(ex)
    return res.status(502).json({ success: false, message: ex.message })
  }
}

// Deletes a geolocation record
// Delete request
// Needs geolocation id here
controller.deleteGeolocation = async (req, res) => {
  try {
    // Find and retrieve the geolocation document using the id passed in the request parameters
    let geoLocation = await GeolocationModel.findById(req.params.id)
    //Delete the geolocation
    await geoLocation.remove()

    //Send success message to end user
    return res.status(200).json({
      success: true,
      data: geoLocation,
    })
  } catch (error) {
    //In case of error, send error status and message to end user.
    return res.status(502).json({
      success: false,
      error: error.message,
    })
  }
}

module.exports = controller
