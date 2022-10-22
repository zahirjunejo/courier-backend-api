const mongoose = require(`mongoose`)
const idValidator = require('mongoose-id-validator')
mongoose.Promise = global.Promise
const { Schema } = mongoose

const MagicLinkSchema = Schema({
  magicToken: { type: String, required: true },
  recipientEmail: { type: String, required: true },
  magicLinkType: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }, //  Timestamp
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  customer: { type: mongoose.Types.ObjectId, ref: 'Customer', required: false },
  department: {
    type: mongoose.Types.ObjectId,
    ref: 'Department',
    required: false,
  },
})
MagicLinkSchema.plugin(idValidator)
MagicLinkSchema.pre(`save`, function (next) {
  this.updatedAt = Date.now()

  return next()
})
MagicLinkSchema.set(`toJSON`, {})
MagicLinkSchema.statics.checkExistingField = async (field, value) => {
  const checkField = await MagicLinkModel.findOne({ [`${field}`]: value })

  return checkField
}
const MagicLinkModel = mongoose.model(`MagicLink`, MagicLinkSchema)

// Export function to create MagicLink model class
module.exports = MagicLinkModel
