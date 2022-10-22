const mongoose = require(`mongoose`)

mongoose.Promise = global.Promise
const { Schema } = mongoose  

const Apps = Schema({
  userId: { type: mongoose.Types.ObjectId, required: true },
  name: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  picture: { type: String, default: `default-app-pic.png` },
  permissions: { type: Array, default: [`admin`, 'driver'] },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
  // AppId == _id
})

// The following code will execute before each model.save() call
const bcrypt = require(`bcrypt-nodejs`)

Apps.pre(`save`, function (callback) {
  const model = this

  model.updated = Date.now()

  // Break if the pass hasn't been modified
  if (!model.isModified(`password`)) return callback()

  // Password changed so we need to hash it before storing on database
  bcrypt.genSalt(5, (err, salt) => {
    if (err) return callback(err)

    // eslint-disable-next-line no-shadow
    bcrypt.hash(model.password, salt, null, (err, hash) => {
      if (err) return callback(err)
      model.password = hash
      callback()
    })
  })
})

// Export function to create Apps model class
module.exports = mongoose.model(`Apps`, Apps)
