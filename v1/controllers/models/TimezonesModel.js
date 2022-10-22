const mongoose = require(`mongoose`)

mongoose.Promise = global.Promise
const { Schema } = mongoose

const Timezones = Schema({
  value: { type: Number, required: true },
  text: { type: String, requried: true, unique: true },
})

module.exports = mongoose.model(`Timezones`, Timezones)
