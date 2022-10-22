// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable no-throw-literal */
//
// Users uses routes use to POST and GET resources from the Mongo DB
//
const dayjs = require('dayjs')
const CountriesModel = require(`./models/CountriesModel`)
const controller = {}

// Create a NEW record
controller.AddRecord = async function (req, res) {
  const record = {
    shortname: req.body.shortname,
    country_name: req.body.country_name,
    phone_code: req.body.phone_code,
  }

  // Execute a query
  const model = new CountriesModel(record)
  const promise = model.save()

  promise
    // eslint-disable-next-line no-shadow
    .then((record) => {
      res.json(record)
    })
    .catch((ex) => {
      res.status(500).json(ex)
    })
}

controller.UpdateRecord = function (req, res) {
  CountriesModel.findById(req.params.id)
    .then(async (record) => {
      if (record === null) {
        throw `Countries record not found with that ID`
      }

      record.shortname = req.body.shortname || record.shortname
      record.country_name = req.body.country_name || record.country_name
      record.phone_code = req.body.phone_code || record.phone_code

      return await record.save()
    })
    .then((record) => {
      res.status(200).json(record)
    })
    .catch((ex) => {
      res.status(500).json(ex)
    })
}

// Get ALL records
controller.GetList = function (req, res) {
  CountriesModel.find({}, (err, records) => {
    if (err) {
      res.status(500).json(err)
    } else {
      res.json(records)
    }
  })
}

// Get a single record by id
controller.GetByID = function (req, res) {
  const query = CountriesModel.findById(req.params.id)

  const promise = query.exec()

  promise
    .then((record) => {
      res.json(record)
    })
    .catch((ex) => {
      res.status(500).json(ex)
    })
}

// Delete a record permanently
controller.DeleteRecord = function (req, res) {
  const query = CountriesModel.findById(req.params.id).exec()
  let id = ``

  query
    .then((record) => {
      if (record !== null) {
        id = record._id

        // eslint-disable-next-line no-undef
        return user.deleteOne()
      }
      throw `Countries record not found with that ID`
    })
    .then(() => {
      res.status(200).json({ message: `Countries record ${id} removed` })
    })
    .catch((ex) => {
      res.status(500).json(ex)
    })
}

// Get an array of records after their update time (in seconds)
controller.GetUpdatedRecordsAfterDate = function (req, res) {
  const promise = CountriesModel.find({
    updated: { $gte: dayjs.unix(req.params.time) },
  }).exec()

  promise
    .then((records) => {
      res.json(records)
    })
    .catch((ex) => {
      res.status(500).json(ex)
    })
}

module.exports = controller
