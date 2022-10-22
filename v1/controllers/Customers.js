const CustomerModel = require(`./models/CustomerModel`)
const UploadsModel = require('./models/UploadsModel')
const GeolocationModel = require(`./models/GeolocationModel`)
const googleMapService = require('../helpers/GoogleMapService')

const controller = {}

controller.addCustomer = async (req, res) => {
  try {
    const _customer = {
      name: req.body.name,
      address: req.body.address,
      departments: req.body.departments,
      requiresPhotoSignature: req.body.requiresPhotoSignature,
      userId: req.body.userId,
    }

    const _addressLocation = {
      Latitude: req.body.addressLocation.Latitude,
      Longitude: req.body.addressLocation.Longitude,
    }
    const addressLocation = new GeolocationModel(_addressLocation)

    let customer = new CustomerModel(_customer)

    customer.addressLocation = addressLocation._id

    await addressLocation.save()
    await customer.save()

    const { signatures, photos, attachments } = req.files
    const _upload = {
      signatureUrls: signatures?.map((x) => x.path),
      photoUrls: photos?.map((x) => x.path),
      attachmentUrls: attachments?.map((x) => x.path),
    }

    const upload = new UploadsModel(_upload)
    await upload.save()
    customer.uploads = upload.id
    await customer.save()

    customer = await CustomerModel.findById(customer.id)
      .populate(['addressLocation', 'uploads', 'departments', 'userId'])
      .exec()

    return res.status(200).json({ success: true, data: { customer } })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.updateCustomer = async (req, res) => {
  try {
    let record = await CustomerModel.findById(req.params.id)
      .populate(['addressLocation', 'uploads'])
      .exec()
    const updateObject = {
      name: req.body.name ?? record.name,
      address: req.body.address ?? record.address,
      departments: req.body.departments ?? record.departments,
      requiresPhotoSignature:
        req.body.requiresPhotoSignature ?? record.requiresPhotoSignature,
      userId: req.body.userId ?? record.userId,
    }

    let customer = await CustomerModel.findByIdAndUpdate(
      req.params.id,
      updateObject,
      { new: true, useFindAndModify: false }
    )
      .populate('addressLocation')
      .exec()

    await GeolocationModel.findByIdAndUpdate(
      customer.addressLocation.id,
      {
        Latitude:
          req.body.addressLocation?.Latitude ??
          customer.addressLocation?.Latitude,
        Longitude:
          req.body.addressLocation?.Longitude ??
          customer.addressLocation?.Longitude,
      },
      { new: true, useFindAndModify: false }
    )

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

    customer = await CustomerModel.findById(customer.id)
      .populate(['addressLocation', 'uploads', 'departments', 'userId'])
      .exec()
    return res.status(200).json({
      success: true,
      data: { customer },
    })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.getCustomer = async (req, res) => {
  try {
    const customer = await CustomerModel.findById(req.params.id)
      .populate([
        { path: 'departments', populate: 'departmentLocation' },
        'userId',
        'addressLocation',
        'uploads',
      ])
      .exec()

    return res.status(200).json({ success: true, data: customer })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

controller.getCustomerByName = async (req, res) => {
  try {
    const customer = await CustomerModel.find({
      name: { $regex: '.*' + req.query.name + '.*', $options: 'i' },
    })
      .populate([
        { path: 'departments', populate: 'departmentLocation' },
        'userId',
        'addressLocation',
        'uploads',
      ])
      .exec()

    return res.status(200).json({ success: true, data: customer })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

controller.getCustomers = async (req, res) => {
  try {
    const customers = await CustomerModel.find()
      .populate([
        { path: 'departments', populate: 'departmentLocation' },
        'userId',
        'addressLocation',
        'uploads',
      ])
      .exec()

    return res.status(200).json({ success: true, data: customers })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

controller.deleteCustomer = async (req, res) => {
  try {
    let customer = await CustomerModel.findById(req.params.id)

    customer = await customer.remove()

    return res.status(200).json({ success: true, data: customer })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

controller.getCustomersAddressAutoComplete = async (req, res) => {
  try {
    let addressString = req.body.address
    let address_suggestions = await CustomerModel.find({
      address: { $regex: '.*' + addressString + '.*', $options: 'i' },
    })
      .select(['_id', 'address'])
      .limit(5)
      .exec()

    let predictions = await googleMapService.placesAutocomplete(
      addressString,
      req.body.location
    )
    predictions = predictions.slice(0, 3)
    return res.status(200).json({
      success: true,
      data: {
        address_suggestions: address_suggestions,
        google_results: predictions,
      },
    })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

module.exports = controller
