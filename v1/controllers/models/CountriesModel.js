const mongoose = require(`mongoose`)

mongoose.Promise = global.Promise
const { Schema } = mongoose

const model = Schema({
  shortname: { type: String, required: true, unique: true },
  country_name: { type: String, required: true, unique: true },
  phone_code: { type: String, required: true, unique: true },
})

module.exports = mongoose.model(`Countries`, model)
