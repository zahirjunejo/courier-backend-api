const mongoose = require(`mongoose`)
const idValidator = require('mongoose-id-validator')
mongoose.Promise = global.Promise
const { Schema } = mongoose

const skippedTasksSchema = Schema({
  Task: { type: mongoose.Types.ObjectId, ref: `Task`, required: true },
  Driver: { type: mongoose.Types.ObjectId, ref: `Driver`, required: true },
  createdAt: { type: Date, default: Date.now }, //  Timestamp
  updatedAt: { type: Date, default: Date.now }, // Timestamp
})
skippedTasksSchema.plugin(idValidator)
skippedTasksSchema.pre('save', function (next) {
  this.updatedAt = Date.now()
  return next()
})

skippedTasksSchema.set('toJSON', {})
skippedTasksSchema.statics.checkExistingField = async (field, value) => {
  const checkField = await skippedTasksModel.findOne({ [`${field}`]: value })
  return checkField
}

const skippedTasksModel = mongoose.model('SkippedTask', skippedTasksSchema)
module.exports = skippedTasksModel
