const mongoose = require('mongoose')
const idValidator = require('mongoose-id-validator')
mongoose.Promise = global.Promise
const { Schema } = mongoose

const WeeklyRouteSchema = Schema({
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  days: [{ type: String, required: true }],
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
  tasks: [
    {
      type: mongoose.Types.ObjectId,
      ref: `Task`,
    },
  ],
  items: [{ type: String, required: false }],
  driverId: { type: mongoose.Types.ObjectId, ref: 'Driver' },
  createdByUser: {
    type: mongoose.Types.ObjectId,
    ref: 'Users',
    required: true,
  },
  createdAt: { type: Date, default: Date.now }, //  Timestamp
  updatedAt: { type: Date, default: Date.now }, // Timestamp
})
WeeklyRouteSchema.plugin(idValidator)
WeeklyRouteSchema.pre('save', function (next) {
  this.updatedAt = Date.now()
  return next()
})
WeeklyRouteSchema.set('toJSON', {})
WeeklyRouteSchema.static.checkExistingField = async (field, value) => {
  const checkField = await WeeklyRouteModel.findOne({ [`${field}`]: value })
  return checkField
}

const WeeklyRouteModel = mongoose.model('WeeklyRoutes', WeeklyRouteSchema)
module.exports = WeeklyRouteModel
