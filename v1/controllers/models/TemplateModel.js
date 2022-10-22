const mongoose = require(`mongoose`)

mongoose.Promise = global.Promise
const { Schema } = mongoose

const templateSchema = Schema({
  templateName: { type: String, required: true },
  xlssSheetUrl: { type: String, required: true },
  thumbnailUrl: { type: String },
  createdAt: { type: Date, default: Date.now }, //  Timestamp
  updatedAt: { type: Date, default: Date.now }, // Timestamp
})

templateSchema.pre(`save`, function (next) {
  this.updatedAt = Date.now()

  return next()
})
templateSchema.set(`toJSON`, {})
templateSchema.statics.checkExistingField = async (field, value) => {
  const checkField = await templateModel.findOne({ [`${field}`]: value })

  return checkField
}
const templateModel = mongoose.model(`template`, templateSchema)

// Export function to create Template model class
module.exports = templateModel
