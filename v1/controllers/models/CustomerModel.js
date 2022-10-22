const mongoose = require(`mongoose`)
const idValidator = require('mongoose-id-validator')
mongoose.Promise = global.Promise
const { Schema } = mongoose

const customerSchema = Schema({
  name: { type: String, required: false },
  address: { type: String, required: false },
  addressLocation: {
    type: mongoose.Types.ObjectId,
    ref: `Geolocation`,
    required: false,
  },
  picture: { type: String, default: `admin-profile-pic.png` },
  departments: [{ type: mongoose.Types.ObjectId, ref: `Department` }],
  createdAt: { type: Date, default: Date.now }, //  Timestamp
  updatedAt: { type: Date, default: Date.now }, // Timestamp
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
  },
  requiresPhotoSignature: {
    type: Boolean,
    default: false,
  },
  uploads: {
    type: mongoose.Types.ObjectId,
    ref: 'Uploads',
    required: false,
  },
})
customerSchema.plugin(idValidator)
customerSchema.pre(`save`, function (next) {
  this.updatedAt = Date.now()

  return next()
})

customerSchema.set(`toJSON`, {})
customerSchema.statics.checkExistingField = async (field, value) => {
  const checkField = await customerModel.findOne({ [`${field}`]: value })

  return checkField
}
const customerModel = mongoose.model(`Customer`, customerSchema)

// Export function to create Customer model class
module.exports = customerModel
