const mongoose = require(`mongoose`)
const idValidator = require('mongoose-id-validator')

mongoose.Promise = global.Promise
const { Schema } = mongoose

const auditSchema = Schema({
  user_id: { type: mongoose.Types.ObjectId, ref: `Users`, required: false },
  entity_name: { type: String, required: true },
  record_id: { type: mongoose.Types.ObjectId, required: false },
  action_type: {
    type: String,
    default: `read`,
    required: false,
  },
  action_time: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})
auditSchema.plugin(idValidator)
auditSchema.pre(`save`, function (next) {
  this.updatedAt = Date.now()

  return next()
})
auditSchema.set(`toJSON`, {})
auditSchema.statics.checkExistingField = async (field, value) => {
  const checkField = await auditModel.findOne({ [`${field}`]: value })

  return checkField
}
const auditModel = mongoose.model(`Audit`, auditSchema)

// Export function to create audit model class
module.exports = auditModel
