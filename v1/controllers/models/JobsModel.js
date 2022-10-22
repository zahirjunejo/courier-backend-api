const mongoose = require(`mongoose`)
const idValidator = require('mongoose-id-validator')

mongoose.Promise = global.Promise
const { Schema } = mongoose

const jobSchema = Schema({
  status: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'COMPLETE', 'CANCELLED'],
    required: true,
  },
  estimatedArrival: { type: Date, required: true },
  arrived: { type: Date, required: false },
  start_time: { type: Date, require: false },
  endDate: { type: Date, required: false },
  estimatedMiles: { type: Number, required: false },
  distanceTravelled: { type: Number, default: 0 },
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
  Tasks: [
    {
      type: mongoose.Types.ObjectId,
      ref: `Task`,
      required: true,
    },
  ],
  items: [{ type: String, required: false }],
  chargeType: { type: mongoose.Schema.Types.ObjectId, ref: `ChargeType` },
  Driver: { type: mongoose.Types.ObjectId, ref: `Driver`, required: true },
  createdByUser: {
    type: mongoose.Types.ObjectId,
    ref: 'Users',
    required: true,
  },
  createdAt: { type: Date, default: Date.now }, //  Timestamp
  updatedAt: { type: Date, default: Date.now }, // Timestamp
})
jobSchema.plugin(idValidator)
jobSchema.pre(`save`, function (next) {
  this.updatedAt = Date.now()

  return next()
})

jobSchema.set(`toJSON`, {})
jobSchema.statics.checkExistingField = async (field, value) => {
  const checkField = await jobModel.findOne({ [`${field}`]: value })

  return checkField
}

const jobModel = mongoose.model(`Job`, jobSchema)

// Export function to create Job model class
module.exports = jobModel
