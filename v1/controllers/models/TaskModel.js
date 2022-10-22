const mongoose = require(`mongoose`)
const idValidator = require('mongoose-id-validator')
mongoose.Promise = global.Promise
const { Schema } = mongoose

const TaskSchema = Schema({
  status: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'COMPLETE', 'CANCELLED'],
    required: true,
  },
  companyname: { type: String, required: false },
  phoneNumber: { type: String, required: false },
  countryCode: { type: String, required: false },
  chargeType: {
    type: mongoose.Types.ObjectId,
    ref: 'ChargeType',
    required: true,
  },
  customerID: {
    type: mongoose.Types.ObjectId,
    ref: `Customer`,
    required: false,
  },
  addressLocation: {
    type: mongoose.Types.ObjectId,
    ref: `Geolocation`,
    required: true,
  },
  department: {
    type: mongoose.Types.ObjectId,
    ref: `Department`,
    required: false,
  },
  address: { type: String, required: true },
  contact: { type: String, required: true },
  upload: {
    type: mongoose.Schema.Types.ObjectId,
    ref: `Uploads`,
    required: false,
  },
  requiresPhotoSignature: {
    type: Boolean,
    default: false,
  },
  extraNotes: { type: String, required: false },
  facility: { type: String, required: false },
  isPickup: { type: Boolean, required: true },
  distanceTravelled: { type: Number, default: 0 },
  estimatedMiles: { type: Number, required: false },
  trackingTime: { type: Date, required: false },
  createdAt: { type: Date, default: Date.now }, //  Timestamp
  updatedAt: { type: Date, default: Date.now }, //  Timestamp
})
TaskSchema.plugin(idValidator)
TaskSchema.pre(`save`, function (next) {
  this.updatedAt = Date.now()

  return next()
})
TaskSchema.set(`toJSON`, {})
TaskSchema.statics.checkExistingField = async (field, value) => {
  const checkField = await TaskModel.findOne({ [`${field}`]: value })

  return checkField
}
const TaskModel = mongoose.model(`Task`, TaskSchema)

// Export function to create Task model class
module.exports = TaskModel
