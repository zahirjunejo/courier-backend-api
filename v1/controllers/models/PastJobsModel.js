const mongoose = require(`mongoose`)
const idValidator = require('mongoose-id-validator')
mongoose.Promise = global.Promise
const { Schema } = mongoose

const pastJobsSchema = Schema({
  status: { type: String, enum: ['COMPLETE', 'CANCELLED'], required: true },
  estimatedArrival: { type: Date, required: true },
  start_time: { type: Date, require: false },
  endDate: { type: Date, required: false },
  estimatedMiles: { type: Number, required: true },
  distanceTravelled: { type: Number, required: false },
  customer: { type: mongoose.Types.ObjectId, ref: `Customer`, required: true },
  department: {
    type: mongoose.Types.ObjectId,
    ref: `Department`,
    required: false,
  },
  Tasks: [
    {
      type: mongoose.Types.ObjectId,
      ref: `Task`,
      required: false,
    },
  ],
  items: [{ type: String, required: true }],
  chargeType: { type: mongoose.Schema.Types.ObjectId, ref: `ChargeType` },
  driverIncome: { type: Number, required: false },
  Driver: { type: mongoose.Types.ObjectId, ref: `Driver`, required: true },
  createdByUser: {
    type: mongoose.Types.ObjectId,
    ref: `Users`,
    required: true,
  },
  createdAt: { type: Date, default: Date.now }, //  Timestamp
  updatedAt: { type: Date, default: Date.now }, // Timestamp
})
pastJobsSchema.plugin(idValidator)
pastJobsSchema.pre(`save`, function (next) {
  this.updatedAt = Date.now()

  return next()
})

pastJobsSchema.set(`toJSON`, {})
pastJobsSchema.statics.checkExistingField = async (field, value) => {
  const checkField = await pastJobsModel.findOne({ [`${field}`]: value })

  return checkField
}

const pastJobsModel = mongoose.model(`PastJobs`, pastJobsSchema)

module.exports = pastJobsModel
