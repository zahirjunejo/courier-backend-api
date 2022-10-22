const mongoose = require(`mongoose`)

mongoose.Promise = global.Promise
const { Schema } = mongoose

const model = Schema({
  state_name: { type: String, required: true, unique: true },
  country_id: { type: Schema.Types.ObjectId, required: true },
})

module.exports = mongoose.model(`States`, model)
