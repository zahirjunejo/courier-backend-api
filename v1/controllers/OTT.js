const OTTModel = require(`./models/OTTModel`)
const RequestModel = require(`./models/RequestRecord`)
const config = require(`../../server-settings.json`)

const client = require(`twilio`)(
  config.server.twilioAccountSid,
  config.server.twilioAuthToken
)
const controller = {}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
//renew token
controller.verify = async (req, res) => {
  try {
    const ott = await OTTModel.findOne({ oneTimeToken: req.body.token })
    if (ott !== null) {
      const rm = await RequestModel.findOne({ jwtToken: req.token })
      rm.isExpired = false
      rm.lastReq = Date.now()
      await rm.save()
    } else {
      return res.status(404).json({
        success: false,
        error: `The one time token has expired. Login all over again.`,
      })
    }
    return res.status(200).json({ success: true, data: ott })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.resendOTT = async (req, res) => {
  try {
    const phoneNo = req.user.phoneNo

    await sleep(6000).then(() => {
      console.log('')
    })
    //Check for verification cycle already exists and cancel it.
    await client.verify
      .services(config.server.twilioVerifySid)
      .verifications(phoneNo)
      .update({ status: 'canceled' })
      .then((verification) => console.log(``))
      .catch((err) => console.log(``))

    await sleep(6000).then(() => {
      console.log('')
    })

    //Sends ott code to user
    await client.verify
      .services(config.server.twilioVerifySid)
      .verifications.create({
        to: phoneNo,
        channel: `sms`,
      })

    return res.status(200).json({
      success: true,
      data: 'New ott has been sent to your phone number.',
    })
  } catch (err) {
    return res.status(502).json({ success: false, error: err.message })
  }
}

module.exports = controller
