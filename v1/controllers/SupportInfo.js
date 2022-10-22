const SupportInfoModel = require(`./models/SupportInfoModel`)
const emailService = require('../helpers/Email')
const controller = {}

controller.addSupportInfo = async (req, res) => {
  try {
    const _supportInfo = {
      contactPersonName: req.body.contactPersonName,
      contactPersonEmail: req.body.contactPersonEmail,
      contactPersonPhone: req.body.contactPersonPhone,
      contactPersonId: req.body.contactPersonId,
      onCall: req.body.onCall,
    }
    const supportInfo = new SupportInfoModel(_supportInfo)

    await supportInfo.save()

    return res.status(200).json({ success: true, data: supportInfo })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.sendSupportEmail = async (req, res) => {
  try {
    const supportInfo = await SupportInfoModel.findById(req.params.id)

    let messageBody = `
    Email: ${req.body.email}
    Phone: ${req.body.phone}
    Name: ${req.body.name}
    Message: ${req.body.message}
    `

    emailService.sendEmail({
      to: supportInfo.contactPersonEmail,
      subject: `Support email`,
      text: messageBody,
    })

    return res
      .status(200)
      .json({ success: true, message: `Support email sent` })
  } catch (err) {
    return res.status(502).json({ success: false, error: err.message })
  }
}

controller.updateSupportInfo = async (req, res) => {
  try {
    let record = await SupportInfoModel.findById(req.params.id)
    const _supportInfo = {
      contactPersonName: req.body.contactPersonName ?? record.contactPersonName,
      contactPersonEmail:
        req.body.contactPersonEmail ?? record.contactPersonEmail,
      contactPersonPhone:
        req.body.contactPersonPhone ?? record.contactPersonPhone,
      contactPersonId: req.body.contactPersonId ?? record.contactPersonId,
      onCall: req.body.onCall ?? record.onCall,
    }
    const supportInfo = await SupportInfoModel.findByIdAndUpdate(
      req.params.id,
      _supportInfo,
      { new: true, useFindAndModify: false }
    )

    return res.status(200).json({ success: true, data: supportInfo })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.getSupportInfo = async (req, res) => {
  try {
    const si = await SupportInfoModel.findById(req.params.id)

    return res.status(200).json({ success: true, data: si })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

controller.getSupportInfos = async (req, res) => {
  try {
    const si = await SupportInfoModel.find({ onCall: true })

    return res.status(200).json({ success: true, data: si })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

controller.deleteSupportInfo = async (req, res) => {
  try {
    let task = await SupportInfoModel.findById(req.params.id)

    task = await task.remove()

    return res.status(200).json({ success: true, data: task })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

module.exports = controller
