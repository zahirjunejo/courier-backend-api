const mongoose = require(`mongoose`)
const idValidator = require('mongoose-id-validator')
mongoose.Promise = global.Promise
const { Schema } = mongoose

const resettokenschema = Schema({
  user: { type: mongoose.Types.ObjectId, ref: `Users`, required: true },
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})
resettokenschema.plugin(idValidator)
resettokenschema.pre(`save`, function (next) {
  this.updatedAt = Date.now()

  return next()
})
resettokenschema.set(`toJSON`, {})
resettokenschema.statics.checkExistingField = async (field, value) => {
  const checkField = await resettokenmodel.findOne({ [`${field}`]: value })

  return checkField
}
const resettokenmodel = mongoose.model(`ResetTokens`, resettokenschema)

// Export function to create audit model class
module.exports = resettokenmodel
