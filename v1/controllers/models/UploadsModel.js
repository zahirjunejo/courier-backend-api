const mongoose = require(`mongoose`)
mongoose.Promise = global.Promise
const { Schema } = mongoose

const uploadSchema = Schema({
  signatureUrls: { type: Array, required: false },
  photoUrls: { type: Array, required: false },
  attachmentUrls: { type: Array, required: false },
  createdAt: { type: Date, default: Date.now }, //  Timestamp
  updatedAt: { type: Date, default: Date.now }, // Timestamp
})

uploadSchema.pre(`save`, function (next) {
  this.updatedAt = Date.now()

  return next()
})
uploadSchema.set(`toJSON`, {})
uploadSchema.statics.checkExistingField = async (field, value) => {
  const checkField = await uploadsModel.findOne({ [`${field}`]: value })

  return checkField
}
const uploadsModel = mongoose.model(`Uploads`, uploadSchema)

// Export function to create Uploads model class
module.exports = uploadsModel
