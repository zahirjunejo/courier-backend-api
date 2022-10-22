const mongoose = require(`mongoose`)
const idValidator = require('mongoose-id-validator')
mongoose.Promise = global.Promise
const { Schema } = mongoose

const QueuedJobSchema = Schema({
  customer: {
    type: mongoose.Types.ObjectId,
    ref: `Customer`,
    required: true,
  },
  department: {
    type: mongoose.Types.ObjectId,
    ref: `Department`,
    required: false,
  },
  startTime: { type: Date, default: Date.now }, //  Timestamp
  endTime: { type: Date, default: Date.now }, //  Timestamp
  estimatedMiles: { type: Number, required: false },
  tasks: [
    {
      type: mongoose.Types.ObjectId,
      ref: `Task`,
      required: false,
    },
  ],
  items: [{ type: String, required: false }],
  createdByUser: {
    type: mongoose.Types.ObjectId,
    ref: 'Users',
    required: true,
  },
  chargeType: { type: mongoose.Types.ObjectId, ref: `ChargeType` },
  createdAt: { type: Date, default: Date.now }, //  Timestamp
  updatedAt: { type: Date, default: Date.now }, // Timestamp
})
QueuedJobSchema.plugin(idValidator)
QueuedJobSchema.pre(`save`, function (next) {
  this.updatedAt = Date.now()

  return next()
})
QueuedJobSchema.set(`toJSON`, {})
QueuedJobSchema.statics.checkExistingField = async (field, value) => {
  const checkField = await QueuedJobModel.findOne({ [`${field}`]: value })

  return checkField
}
const QueuedJobModel = mongoose.model(`QueuedJob`, QueuedJobSchema)

// Export function to create Job model class
module.exports = QueuedJobModel
