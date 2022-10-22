const mongoose = require(`mongoose`)
const idValidator = require('mongoose-id-validator')
mongoose.Promise = global.Promise
const { Schema } = mongoose
const CacheGeolocationSchema = Schema({
  originLat: { type: String, required: true },
  originLon: { type: String, required: true },
  destinationLat: { type: String, required: true },
  destinationLon: { type: String, required: true },
  estimatedDistance: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }, //  Timestamp
  updatedAt: { type: Date, default: Date.now }, // Timestamp
})
CacheGeolocationSchema.plugin(idValidator)
CacheGeolocationSchema.pre(`save`, function (next) {
  this.updatedAt = Date.now()

  return next()
})

CacheGeolocationSchema.set(`toJSON`, {})
const CacheGeolocationModel = mongoose.model(
  `CachedGeolocation`,
  CacheGeolocationSchema
)
module.exports = CacheGeolocationModel
