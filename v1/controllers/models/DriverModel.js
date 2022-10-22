const mongoose = require(`mongoose`)
const idValidator = require('mongoose-id-validator')

mongoose.Promise = global.Promise
const { Schema } = mongoose

const Driver = Schema({
  date_of_birth: { type: String, required: false },
  current_license_number: { type: String, required: false },
  work_cell_number: { type: String, required: false },
  driverType: { type: String, enum: ['REGULAR', 'STAT'], required: false },
  home_address: { type: String, required: false },
  commission: { type: Number, required: false },
  addressLocation: {
    type: mongoose.Types.ObjectId,
    ref: `Geolocation`,
    required: false,
  },
  picture: { type: String, default: `admin-profile-pic.png` },
  bank_name: { type: String, required: false },
  account_title: { type: String, required: false },
  account_number: { type: String, required: false },
  iban_number: { type: String, required: false },
  routing_number: { type: String, required: false },
  on_duty: { type: Boolean, default: false },
  created: { type: Date, default: Date.now }, //  Timestamp
  updated: { type: Date, default: Date.now }, // Timestamp
  userId: {
    type: mongoose.Types.ObjectId,
    ref: 'Users',
    required: true,
  },
  uploads: {
    type: mongoose.Types.ObjectId,
    ref: 'Uploads',
    required: false,
  },
  jobTrackingId: {
    type: mongoose.Types.ObjectId,
    ref: 'Job',
    required: false,
  },
  taskTrackingId: {
    type: mongoose.Types.ObjectId,
    ref: 'Task',
    required: false,
  },
})
Driver.plugin(idValidator)
Driver.pre(`save`, function (next) {
  this.updatedAt = Date.now()

  return next()
})

Driver.set(`toJSON`, {})
Driver.statics.checkExistingField = async (field, value) => {
  const checkField = await DriverModel.findOne({ [`${field}`]: value })

  return checkField
}
const DriverModel = mongoose.model(`Driver`, Driver)

// Export function to create Users model class
module.exports = DriverModel
