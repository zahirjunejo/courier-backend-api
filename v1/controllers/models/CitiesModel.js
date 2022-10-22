const mongoose = require(`mongoose`)

mongoose.Promise = global.Promise
const { Schema } = mongoose

const model = Schema({
  city_name: { type: String, required: true, unique: true },
  state_id: { type: Schema.Types.ObjectId, required: true },
})

module.exports = mongoose.model(`Cities`, model)
