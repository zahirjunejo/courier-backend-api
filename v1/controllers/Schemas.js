const mongoose = require('mongoose')
const controller = {}
const MetaDataModel = require('./models/MetaDataModel')
const dayjs = require('dayjs')

controller.getAllSchemas = (req, res) => {
  try {
    let data = []
    const excludes = ['Apps', 'Audit', 'OTT']
    const schemas = mongoose.modelNames()

    schemas.forEach(function (x) {
      if (!excludes.includes(x)) {
        data.push(x)
      }
    })

    return res.status(200).json({ success: true, data: data })
  } catch (ex) {
    return res.status(502).json({ success: false, ex })
  }
}

controller.getSchemaData = async (req, res) => {
  try {
    let filter = {}
    if (req.query.department) {
      filter.department = req.query.department
    }

    if (req.query.customer) {
      filter.customer = req.query.customer
    }

    if (req.query.from && req.query.to) {
      filter.createdAt = {
        $gte: dayjs(req.query.from, 'YYYY-MM-DD HH:mm').utc(true).toDate(),
        $lte: dayjs(req.query.to, 'YYYY-MM-DD HH:mm').utc(true).toDate(),
      }
    }

    let filterSkip = parseInt(req.query.skip ? req.query.skip : 0)
    let filterLimit = parseInt(req.query.limit ? req.query.limit : 10)
    let modelName = req.params.collection.toString()
    const CollectionSchema = mongoose.model(modelName)
    CollectionSchema.find(
      filter,
      null,
      { skip: filterSkip, limit: filterLimit },
      function (err, results) {
        return res.status(200).json({ success: true, data: results })
      }
    )
  } catch (ex) {
    return res.status(502).json({ success: false, ex })
  }
}

controller.updateDocument = async (req, res) => {
  try {
    let modelName = req.params.collection.toString()
    let documentId = req.body._id
    let updateable = req.body
    delete updateable._id
    const CollectionSchema = mongoose.model(modelName)
    CollectionSchema.updateOne(
      { _id: { $gte: documentId } },
      updateable,
      async function (err, docs) {
        if (err) {
          return res
            .status(400)
            .json({ success: false, message: err.toString() })
        } else {
          let document = await CollectionSchema.findOne({
            _id: { $gte: documentId },
          })
          return res.status(200).json({ success: true, data: document })
        }
      }
    )
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.addMetaData = async (req, res) => {
  try {
    let metaData = new MetaDataModel()
    let dataId = req.body._id
    let updateable = req.body
    delete updateable._id
    metaData.data = updateable
    metaData.dataId = dataId
    metaData.markModified('data')
    await metaData.save()
    return res.status(200).json({ success: true, data: metaData })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.updateMetaData = async (req, res) => {
  try {
    let metaData = await MetaDataModel.findOne({ dataId: req.params.id })
    metaData.data = req.body
    metaData.markModified('data')
    await metaData.save()
    return res.status(200).json({ success: true, data: metaData })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.getAllMetaData = async (req, res) => {
  try {
    let metaData = await MetaDataModel.find()
    return res.status(200).json({ success: true, data: metaData })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.getMetaData = async (req, res) => {
  try {
    let metaData = await MetaDataModel.findById(req.params.id)
    return res.status(200).json({ success: true, data: metaData })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.deleteMetaData = async (req, res) => {
  try {
    let metaData = await MetaDataModel.findOne({ dataId: req.params.id })
    await metaData.remove()
    return res.status(200).json({ success: true, data: metaData })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

module.exports = controller
