const mongoose = require(`mongoose`)
const idValidator = require('mongoose-id-validator')
mongoose.Promise = global.Promise
const { Schema } = mongoose

const supportInfoSchema = Schema({
  contactPersonName: { type: String, required: true },
  contactPersonEmail: { type: String, required: true },
  contactPersonPhone: { type: String, required: false },
  onCall: { type: Boolean, default: false },
  contactPersonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: `Users`,
    required: false,
  },
  createdAt: { type: Date, default: Date.now }, //  Timestamp
  updatedAt: { type: Date, default: Date.now }, // Timestamp
})
supportInfoSchema.plugin(idValidator)
supportInfoSchema.pre(`save`, function (next) {
  this.updatedAt = Date.now()

  return next()
})

supportInfoSchema.set(`toJSON`, {})

supportInfoSchema.statics.checkExistingField = async (field, value) => {
  const checkField = await supportInfoModel.findOne({ [`${field}`]: value })

  return checkField
}
const supportInfoModel = mongoose.model(`SupportInfo`, supportInfoSchema)

// Export function to create SupportInfo model class
module.exports = supportInfoModel
