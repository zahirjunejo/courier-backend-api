const mongoose = require(`mongoose`)
const idValidator = require('mongoose-id-validator')

mongoose.Promise = global.Promise
const { Schema } = mongoose

const OTTSchema = Schema({
  oneTimeToken: { type: Number, required: true },
  recipientPhoneNo: { type: String, required: true },
  recipientEmail: { type: String, required: true },
  jwtToken: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }, //  Timestamp
})
OTTSchema.plugin(idValidator)
OTTSchema.pre(`save`, function (next) {
  this.updatedAt = Date.now()

  return next()
})
OTTSchema.set(`toJSON`, {})
OTTSchema.statics.checkExistingField = async (field, value) => {
  const checkField = await OTTModel.findOne({ [`${field}`]: value })

  return checkField
}
const OTTModel = mongoose.model(`OTT`, OTTSchema)

// Export function to create OTT model class
module.exports = OTTModel
