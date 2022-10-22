const TaskModel = require(`./models/TaskModel`)
const UploadsModel = require('./models/UploadsModel')
const GeolocationModel = require(`./models/GeolocationModel`)
const googlemapservice = require(`../helpers/GoogleMapService`)
const settings = require(`../../server-settings.json`)
const client = require(`twilio`)(
  settings.server.twilioAccountSid,
  settings.server.twilioAuthToken
)
const controller = {}

controller.addTask = async (req, res) => {
  try {
    const _task = {
      status: 'PENDING',
      customerID: req.body.customerID,
      chargeType: req.body.chargeType,
      companyname: req.body.companyname,
      requiresPhotoSignature: req.body.requiresPhotoSignature,
      contact: req.body.contact,
      department: req.body.department,
      extraNotes: req.body.extraNotes,
      facility: req.body.facility,
      isPickup: req.body.isPickup,
    }

    if (req.body.phoneNumber && req.body.countryCode) {
      await client.lookups.v1
        .phoneNumbers(req.body.phoneNumber)
        .fetch({ countryCode: req.body.countryCode })
        .then((phoneno) => {
          _task.phoneNumber = phoneno.phoneNumber
        })
        .catch((err) => {
          throw new Error('phoneNumber does not exist in this country')
        })
    }

    let response = await googlemapservice.placesAutocompleteTask(
      req.body.address
    )
    if (response.length == 0) {
      throw new Error(
        'Sorry, google maps api could not find a location matching your address.'
      )
    }

    _task.address = response[0].description

    const _addressLocation = {
      Latitude: response[0].geolocation.lat,
      Longitude: response[0].geolocation.lng,
    }
    const addressLocation = new GeolocationModel(_addressLocation)
    await addressLocation.save()

    const task = new TaskModel(_task)

    task.addressLocation = addressLocation._id
    await task.save()

    return res
      .status(200)
      .json({ success: true, data: { task, addressLocation } })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.updateTask = async (req, res) => {
  try {
    let record = await TaskModel.findById(req.params.id)
    const updateObject = {
      status: req.body.status ?? record.status,
      chargeType: req.body.chargeType ?? record.chargeType,
      customerID: req.body.customerID ?? record.customerID,
      contact: req.body.contact ?? record.contact,
      companyname: req.body.companyname ?? record.companyname,
      requiresPhotoSignature:
        req.body.requiresPhotoSignature ?? record.requiresPhotoSignature,
      department: req.body.department ?? record.department,
      extraNotes: req.body.extraNotes ?? record.extraNotes,
      facility: req.body.facility ?? record.facility,
      isPickup: req.body.isPickup ?? record.isPickup,
    }

    if (req.body.phoneNumber && req.body.countryCode) {
      await client.lookups.v1
        .phoneNumbers(req.body.phoneNumber)
        .fetch({ countryCode: req.body.countryCode })
        .then((phoneno) => {
          updateObject.phoneNumber = phoneno.phoneNumber
        })
        .catch((err) => {
          throw new Error('phoneNumber does not exist in this country')
        })
    }

    const task = await TaskModel.findByIdAndUpdate(
      req.params.id,
      updateObject,
      { new: true, useFindAndModify: false }
    )

    return res.status(200).json({
      success: true,
      data: { task },
    })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.completeTask = async (req, res) => {
  try {
    if (req.files) {
      const { signatures, photos, attachments } = req.files
      const _upload = {
        signatureUrls: signatures?.map((x) => x.path),
        photoUrls: photos?.map((x) => x.path),
        attachmentUrls: attachments?.map((x) => x.path),
      }

      const upload = new UploadsModel(_upload)
      await upload.save()
      await TaskModel.findByIdAndUpdate(
        req.params.id,
        { upload: upload.id },
        { useFindAndModify: false }
      )
    }

    let task = await TaskModel.findById(req.params.id)
      .populate(['department', 'customerID', 'upload', 'addressLocation'])
      .exec()

    if (task.requiresPhotoSignature) {
      if (task.upload) {
        await TaskModel.findByIdAndUpdate(
          task.id,
          { status: 'COMPLETE' },
          { useFindAndModify: false, new: true }
        )
      } else {
        throw new Error(`Task ${task.id} needs photo/signature proof`)
      }
    } else {
      await TaskModel.findByIdAndUpdate(
        task.id,
        { status: 'COMPLETE' },
        { useFindAndModify: false, new: true }
      )
    }

    task = await TaskModel.findById(req.params.id)
      .populate(['department', 'customerID', 'upload', 'addressLocation'])
      .exec()

    return res.status(200).json({ success: true, data: task })
  } catch (ex) {
    return res.status(502).json({ success: false, message: ex.message })
  }
}

controller.getTask = async (req, res) => {
  try {
    const task = await TaskModel.findById(req.params.id)
      .populate(['addressLocation', 'customerID', 'department'])
      .exec()

    return res.status(200).json({ success: true, data: task })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

controller.getTasks = async (req, res) => {
  try {
    const task = await TaskModel.find()
      .populate(['addressLocation', 'customerID', 'department'])
      .exec()

    return res.status(200).json({ success: true, data: task })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

controller.deleteTask = async (req, res) => {
  let task = await TaskModel.findById(req.params.id)

  task = await task.remove()

  return res.status(200).json({ success: true, data: task })
}

module.exports = controller
