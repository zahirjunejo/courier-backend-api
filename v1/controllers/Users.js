// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable no-throw-literal */
// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable no-shadow */
//
// Users uses routes use to POST and GET resources from the Mongo DB
//
const dayjs = require('dayjs')
const nodemailer = require('nodemailer')
const emailService = require('../helpers/Email')
const crypto = require(`crypto`)
const UsersModel = require(`./models/UsersModel`)
const ResetTokensModel = require('./models/ResetTokensModel')
const controller = {}
const settings = require(`../../server-settings.json`)
const DriverModel = require('./models/DriverModel')
const CustomerModel = require('./models/CustomerModel')
const client = require(`twilio`)(
  settings.server.twilioAccountSid,
  settings.server.twilioAuthToken
)

const validateUserName = async function (name) {
  let result = false
  // eslint-disable-next-line id-length
  const p = UsersModel.findOne({ username: name }).exec()

  await p.then((user) => {
    if (user === null) {
      result = true
    }
  })

  return result
}

// POST API_IP/VERSION/users/
// Create a NEW User
// AddUser
controller.AddUser = async function (req, res) {
  try {
    if (!req.body.phoneNo && !req.body.countryCode) {
      return res.status(500).send({
        success: false,
        error: 'Phone number and country code is required.',
      })
    }
    await client.lookups.v1
      .phoneNumbers(req.body.phoneNo)
      .fetch({ countryCode: req.body.countryCode })
      .then((phoneno) => {
        req.body.phoneNo = phoneno.phoneNumber
      })

    const user = {
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      email: req.body.email,
      username: req.body.username,
      password: req.body.password,
      countryCode: req.body.countryCode,
      phoneNo: req.body.phoneNo,
      roles: req.body.roles,
    }

    // Force public name to fit 60 char limit
    if (typeof user.username !== `undefined`) {
      user.username = user.username.slice(0, 60)
    }

    if ((await validateUserName(user.username)) === false) {
      return res.status(500).json({ error: `That username already exists` })
    }

    // Execute a query
    const model = new UsersModel(user)
    await model.save()

    return res
      .status(200)
      .json({ success: true, data: model, message: 'Success!' })
  } catch (ex) {
    return res.status(502).json({ success: false, message: ex.message })
  }
}

// GET API_IP/VERSION/users/
// Get ALL Users
// GetUsersList
controller.GetUsersList = function (req, res) {
  UsersModel.find({}, (err, users) => {
    if (err) {
      res.status(500).json(err)
    } else {
      res.json(users)
    }
  })
}

// GET API_IP/VERSION/users/:id
// Get a single User
// GetUserByID
controller.GetUserByID = function (req, res) {
  const query = UsersModel.findById(req.params.id)

  const promise = query.exec()

  promise
    .then((user) => {
      res.json(user)
    })
    .catch((ex) => {
      res.status(500).json(ex)
    })
}

// PUT API_IP/VERSION/users/:id
// Update a User
// UpdateUser
controller.UpdateUser = async function (req, res) {
  try {
    let user = await UsersModel.findById(req.params.id)
    user.first_name = req.body.first_name ?? user.first_name
    user.last_name = req.body.last_name ?? user.last_name
    user.username = req.body.username ?? user.username
    user.email = req.body.email ?? user.email
    user.picture = req.body.picture ?? user.picture
    user.is_deleted = req.body.is_deleted ?? user.is_deleted
    user.status = req.body.status ?? user.status
    user.roles = req.body.roles ?? user.roles
    user.password = req.body.password ?? user.password

    if (req.body.phoneNo && req.body.countryCode) {
      await client.lookups.v1
        .phoneNumbers(req.body.phoneNo)
        .fetch({ countryCode: req.body.countryCode })
        .then((phoneno) => {
          user.phoneNo = phoneno.phoneNumber
          user.countryCode = req.body.countryCode
        })
        .catch((err) => {
          throw new Error(
            'Please make sure you have the correct Phone no. and Country code'
          )
        })
    }
    await user.save()

    return res
      .status(200)
      .json({ success: true, data: user, message: 'Success!' })
  } catch (ex) {
    return res.status(502).json({ success: false, message: ex.message })
  }
}

// DELETE API_IP/VERSION/users/:id
// Delete a user permanently
// DeleteUser
controller.DeleteUser = async function (req, res) {
  try {
    let user = await UsersModel.findById(req.params.id)
    await user.remove()
    await DriverModel.deleteMany({ userId: req.params.id })
    await CustomerModel.deleteMany({ userId: req.params.id })

    return res.status(200).json({ success: true, data: user })
  } catch (ex) {
    return res.status(502).json({ success: false, message: ex.message })
  }
}

// GET API_IP/VERSION/users/since/:time
// Get an array of users after the time (in seconds)
// GetUsersAfterDate
controller.GetUsersAfterDate = function (req, res) {
  const promise = UsersModel.find({
    updated: { $gte: dayjs().unix(req.params.time) },
  }).exec()

  promise
    .then((users) => {
      res.json(users)
    })
    .catch((ex) => {
      res.status(500).json(ex)
    })
}

controller.ForgetPassword = async function (req, res) {
  const email = req.body.email
  const user = await UsersModel.findOne({ email: email }).exec()

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User does not exist',
    })
  } else {
    let rt = {
      user: user._id,
      token: crypto.randomBytes(32).toString('hex'),
    }

    let resetToken = new ResetTokensModel(rt)
    await resetToken.save()

    let subject = 'Reset password'
    let link = `${settings.server.clientURL}/v1/forget-password-verify/${resetToken.token}`
    let message = `Please follow this link to set your new password <a href=${link}>here<a/>`

    emailService.sendEmail({
      to: email,
      subject: subject,
      html: message,
    })
    return res.status(200).json({
      success: true,
      message: 'Verification link has been sent to your registered email',
    })
  }
}

controller.ForgetPasswordVerify = async function (req, res) {
  try {
    const password = req.body.password
    if (!password) {
      throw new Error('Password is missing in request')
    }
    let resetToken = await ResetTokensModel.findOne({ token: req.params.token })
    if (!resetToken) throw new Error('No such reset token found.')

    let user = await UsersModel.findById(resetToken.user)
    user.password = password
    await user.save()
    await ResetTokensModel.deleteMany({ user: user.id })

    return res
      .status(200)
      .json({ success: true, message: 'Password has been reset' })
  } catch (ex) {
    return res.status(502).json({ success: false, message: ex.message })
  }
}

module.exports = controller
