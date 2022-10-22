const mongoose = require(`mongoose`)
const idValidator = require('mongoose-id-validator')

mongoose.Promise = global.Promise
const { Schema } = mongoose

const DepartmentSchema = Schema({
  departmentName: { type: String, required: true },
  departmentEmail: { type: String, required: true },
  departmentAddress: { type: String, required: true },
  departmentPhoneNo: { type: String, required: false },
  departmentLocation: {
    type: mongoose.Types.ObjectId,
    ref: `Geolocation`,
    required: true,
  },
  departmentContactPersonName: {
    type: String,
    required: false,
  },
  requiresPhotoSignature: {
    type: Boolean,
    default: false,
  },
  createdAt: { type: Date, default: Date.now }, //  Timestamp
  updatedAt: { type: Date, default: Date.now }, // Timestamp
})
DepartmentSchema.plugin(idValidator)
DepartmentSchema.pre(`save`, function (next) {
  this.updatedAt = Date.now()

  return next()
})
DepartmentSchema.set(`toJSON`, {})
DepartmentSchema.statics.checkExistingField = async (field, value) => {
  const checkField = await DepartmentModel.findOne({ [`${field}`]: value })

  return checkField
}
const DepartmentModel = mongoose.model(`Department`, DepartmentSchema)

// Export function to create Department model class
module.exports = DepartmentModel
