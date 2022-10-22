require(`dotenv`).config()
const crypto = require(`crypto`)
const emailService = require('../helpers/Email')
const settings = require('../../server-settings.json')
const jwt = require(`jsonwebtoken`)

const MagicLinkModel = require(`./models/MagicLinkModel`)
const UsersModel = require('./models/UsersModel')
const DriversModel = require('./models/DriverModel')
const CustomersModel = require('./models/CustomerModel')
const RequestsModel = require(`./models/RequestRecord`)
const GeolocationModel = require('./models/GeolocationModel')
const UploadsModel = require('./models/UploadsModel')
const DepartmentModel = require('./models/DepartmentModel')

const controller = {}

controller.sendMagicLink = async (req, res) => {
  if (req.body.magicLinkType == 'department') {
    try {
      if (!req.body.customer || !req.body.department) {
        throw new Error('Customer id and department id is required.')
      }

      let customer = await CustomersModel.findById(req.body.customer)
        .populate('userId')
        .exec()

      if (customer == null) throw new Error('Customer does not exist.')

      if (!customer.departments.includes(req.body.department))
        throw new Error(
          'Customer exists but your department does not exist in this customer.'
        )

      let department = await DepartmentModel.findById(req.body.department)
      if (department == null)
        throw new Error('Department does not exist in the system.')

      const magicToken = crypto.randomBytes(32).toString(`hex`)
      const _magicLink = {
        magicToken,
        recipientEmail: customer.userId.email,
        magicLinkType: req.body.magicLinkType,
        customer: customer.id,
        department: department.id,
      }
      const magicLink = new MagicLinkModel(_magicLink)
      await magicLink.save()

      const token_part = `?token=${magicToken}`
      const magic_url = `${settings.server.clientURL}/MagicLink${token_part}`

      emailService.sendEmail({
        to: customer.userId.email,
        subject: `Department verification link created.`,
        html: `Click on the following link <a href=${magic_url}>here</a>.`,
      })

      return res.status(200).json({ success: true, data: magicLink })
    } catch (ex) {
      return res.status(502).json({ success: false, error: ex.message })
    }
  } else {
    try {
      if (!req.body.recipientEmail || !req.body.magicLinkType) {
        throw new Error('recipientEmail and magicLinkType is required.')
      }

      if (!['customer', 'driver'].includes(req.body.magicLinkType)) {
        throw new Error('Magic link type can only be customer or driver')
      }

      const _user = {
        email: req.body.recipientEmail,
        username: req.body.recipientEmail,
        roles: [req.body.magicLinkType],
      }

      await UsersModel.findOne({ email: req.body.recipientEmail }).then(
        (data) => {
          if (data != null) throw new Error('This email is already registered')
        }
      )

      const user = new UsersModel(_user)

      const magicToken = crypto.randomBytes(32).toString(`hex`)
      const _magicLink = {
        magicToken,
        recipientEmail: req.body.recipientEmail,
        magicLinkType: req.body.magicLinkType,
      }
      const magicLink = new MagicLinkModel(_magicLink)
      await user.save()
      if (req.body.magicLinkType == 'customer') {
        const customer = new CustomersModel({ userId: user._id })
        let customerGeolocation = new GeolocationModel({
          Latitude: '',
          Longitude: '',
        })
        customerGeolocation = await customerGeolocation.save()
        customer.addressLocation = customerGeolocation._id
        let uploads = new UploadsModel({
          signatureUrls: [],
          photoUrls: [],
          attachmentUrls: [],
        })
        await uploads.save()
        customer.uploads = uploads.id
        await customer.save()
      } else {
        const driver = new DriversModel({ userId: user._id })
        let driverGeolocation = new GeolocationModel({
          Latitude: '',
          Longitude: '',
        })
        driverGeolocation = await driverGeolocation.save()
        driver.addressLocation = driverGeolocation._id
        let uploads = new UploadsModel({
          signatureUrls: [],
          photoUrls: [],
          attachmentUrls: [],
        })
        await uploads.save()
        driver.uploads = uploads.id
        await driver.save()
      }

      await magicLink.save()

      const token_part = `?token=${magicToken}`
      const magic_url = `${settings.server.clientURL}/MagicLink${token_part}`

      emailService.sendEmail({
        to: req.body.recipientEmail,
        subject: `Please click on the verification link.`,
        html: `Click on the following link <a href=${magic_url}>here</a>.`,
      })

      return res.status(200).json({ success: true, data: magicLink })
    } catch (ex) {
      return res.status(502).json({ success: false, error: ex.message })
    }
  }
}

controller.testMail = async (req, res) => {
  try {
    emailService.sendEmail({
      to: req.body.recipientEmail,
      subject: `Relax, this is just a drill.`,
      text: 'Hello! Hello! Hellooo!',
      html: `<h1>Hello! Hello! Hellooo!</h1>`,
    })

    return res.status(200).json({ success: true, message: 'sent' })
  } catch (ex) {
    return res
      .status(502)
      .json({ success: false, error: ex.message || `internal server error` })
  }
}

controller.verify = async (req, res) => {
  try {
    const magicLink = await MagicLinkModel.findOne({
      magicToken: req.query.token,
    })

    if (magicLink != null) {
      const user = await UsersModel.findOne({
        email: magicLink.recipientEmail,
      })

      magicLink.userId = user._id
      await magicLink.save()

      if (magicLink.customer && magicLink.department) {
        const token = jwt.sign(
          { customer: magicLink.customer, department: magicLink.department },
          settings.server.secret,
          {
            algorithm: 'HS512',
          }
        )
        const rm = {
          jwtToken: token,
          userId: user._id,
          lastReq: Date.now(),
          isExpired: false,
        }

        const foundReq = await RequestsModel.findOne({
          jwtToken: token,
        })

        if (foundReq === null) {
          const reqmodel = new RequestsModel(rm)

          await reqmodel.save()
        }

        let customer = await CustomersModel.findById(magicLink.customer)
        let department = await DepartmentModel.findById(magicLink.department)
        return res.status(200).json({
          success: true,
          data: {
            customer,
            department,
            token,
          },
        })
      } else {
        let customer = null
        let driver = null

        if (user.roles.includes('driver')) {
          driver = await DriversModel.findOne({ userId: user._id })
        }

        if (user.roles.includes('customer')) {
          customer = await CustomersModel.findOne({ userId: user._id })
        }

        const token = jwt.sign({ sub: user._id }, settings.server.secret, {
          algorithm: 'HS512',
        })

        const rm = {
          jwtToken: token,
          userId: user._id,
          lastReq: Date.now(),
          isExpired: false,
        }

        const foundReq = await RequestsModel.findOne({
          jwtToken: token,
        })

        if (foundReq === null) {
          const reqmodel = new RequestsModel(rm)

          await reqmodel.save()
        }

        return res.status(200).json({
          success: true,
          data: {
            user,
            customer,
            driver,
            token,
          },
        })
      }
    }

    return res.status(404).json({ success: false, error: 'Not found' })
  } catch (ex) {
    return res.status(502).json({ success: false, message: ex.message })
  }
}

module.exports = controller
