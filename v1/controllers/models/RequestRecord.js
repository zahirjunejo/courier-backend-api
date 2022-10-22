const mongoose = require('mongoose')
mongoose.Promise = global.Promise

const { Schema } = mongoose

const Requests = Schema({
  jwtToken: { type: String, required: true },
  lastReq: { type: Date, default: Date.now },
  isExpired: { type: Boolean, default: false },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: false,
  },
})

Requests.set('toJSON', {})

const requestModel = mongoose.model('Requests', Requests)

module.exports = requestModel
