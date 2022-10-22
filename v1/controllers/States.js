// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable no-shadow */
//
// Users uses routes use to POST and GET resources from the Mongo DB
//
const dayjs = require('dayjs')
const StatesModel = require(`./models/StatesModel`)
const controller = {}

// Create a NEW record
controller.AddRecord = async function (req, res) {
  const record = {
    state_name: req.body.state_name,
    country_id: req.body.country_id,
  }

  // Execute a query
  const model = new StatesModel(record)
  const promise = model.save()

  promise
    .then((record) => {
      res.json(record)
    })
    .catch((ex) => {
      res.status(500).json(ex)
    })
}

// Get ALL records
controller.GetList = function (req, res) {
  StatesModel.find({}, (err, records) => {
    if (err) {
      res.status(500).json(err)
    } else {
      res.json(records)
    }
  })
}

// Get a single record by id
controller.GetByID = function (req, res) {
  const query = StatesModel.findById(req.params.id)

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
  const query = StatesModel.findById(req.params.id).exec()
  let id = ``

  query
    .then((record) => {
      if (record !== null) {
        id = record._id

        // eslint-disable-next-line no-undef
        return user.deleteOne()
      }
      // eslint-disable-next-line no-throw-literal
      throw `State not found with that ID`
    })
    .then(() => {
      res.status(200).json({ message: `State ${id} removed` })
    })
    .catch((ex) => {
      res.status(500).json(ex)
    })
}

// Get an array of records after their update time (in seconds)
controller.GetUpdatedRecordsAfterDate = function (req, res) {
  const promise = StatesModel.find({
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
