const mongoose = require(`mongoose`)

mongoose.Promise = global.Promise
const { Schema } = mongoose

const Geolocation = Schema({
  Latitude: { type: String, required: false },
  Longitude: { type: String, required: false },
  created: { type: Date, default: Date.now }, //  Timestamp
  updated: { type: Date, default: Date.now }, // Timestamp
})

Geolocation.pre(`save`, function (next) {
  this.updatedAt = Date.now()

  return next()
})
Geolocation.set(`toJSON`, {})
Geolocation.statics.checkExistingField = async (field, value) => {
  const checkField = await GeolocationModel.findOne({ [`${field}`]: value })

  return checkField
}
const GeolocationModel = mongoose.model(`Geolocation`, Geolocation)

// Export function to create Users model class
module.exports = GeolocationModel
