const mongoose = require(`mongoose`)

mongoose.Promise = global.Promise
const { Schema } = mongoose

const jobDriverInterSchema = Schema({
  Job: { type: mongoose.Types.ObjectId, ref: `Job`, required: true },
  Driver: { type: mongoose.Types.ObjectId, ref: `Driver`, required: true },
  createdAt: { type: Date, default: Date.now }, //  Timestamp
  updatedAt: { type: Date, default: Date.now }, // Timestamp
})

jobDriverInterSchema.pre('save', function (next) {
  this.updatedAt = Date.now()
  return next()
})

jobDriverInterSchema.set('toJSON', {})
jobDriverInterSchema.statics.checkExistingField = async (field, value) => {
  const checkField = await jobDriverInterModel.findOne({ [`${field}`]: value })
  return checkField
}

const jobDriverInterModel = mongoose.model('JobDriver', jobDriverInterSchema)
module.exports = jobDriverInterModel
