const mongoose = require(`mongoose`)

mongoose.Promise = global.Promise
const { Schema } = mongoose

const Users = Schema({
  first_name: { type: String, required: false },
  last_name: { type: String, required: false },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please fill a valid email address',
    ],
  },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  picture: { type: String, default: `admin-profile-pic.png` },
  is_deleted: { type: Boolean, default: false },
  status: { type: String, default: `Active` },
  roles: {
    type: [String],
    default: [],
    enum: ['admin', 'driver', 'customer', 'department'],
  },
  phoneNo: { type: String, required: false },
  countryCode: { type: String, required: false },
  created: { type: Date, default: Date.now }, //  Timestamp
  updated: { type: Date, default: Date.now }, // Timestamp
})

// The following code will execute before each user.save() call
const bcrypt = require(`bcrypt-nodejs`)

Users.pre(`save`, function (callback) {
  const user = this

  user.updated = new Date(Date.now())

  // Break if the pass hasn't been modified
  if (!user.isModified(`password`)) return callback()

  // Password changed so we need to hash it before storing on database
  bcrypt.genSalt(5, (err, salt) => {
    if (err) return callback(err)

    // eslint-disable-next-line no-shadow
    bcrypt.hash(user.password, salt, null, (err, hash) => {
      if (err) return callback(err)
      user.password = hash
      callback()
    })
  })
})

// Export function to create Users model class
const Usermodel = mongoose.model(`Users`, Users)

module.exports = Usermodel
