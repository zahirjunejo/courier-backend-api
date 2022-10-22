const mongoose = require(`mongoose`)
const idValidator = require('mongoose-id-validator')
mongoose.Promise = global.Promise
const { Schema } = mongoose
const metaDataSchema = Schema({
  dataId: { type: Schema.Types.ObjectId, required: true },
  data: {},
  createdAt: { type: Date, default: Date.now }, //  Timestamp
  updatedAt: { type: Date, default: Date.now }, // Timestamp
})
metaDataSchema.plugin(idValidator)
metaDataSchema.pre(`save`, function (next) {
  this.updatedAt = Date.now()

  return next()
})

metaDataSchema.set(`toJSON`, {})
const metaDataModel = mongoose.model(`MetaData`, metaDataSchema)

// Export function to create Job model class
module.exports = metaDataModel
