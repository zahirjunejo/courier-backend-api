const AuditModel = require(`./models/AuditModel`)
const dayjs = require('dayjs')
const controller = {}

controller.addAudit = async (req, res) => {
  try {
    const _audit = {
      user_id: req.body.user_id,
      entity_name: req.body.entity_name,
      record_id: req.body.record_id,
      action_type: req.body.action_type,
      action_time: dayjs(req.body.action_time).utc(true).toDate(),
    }
    const audit = new AuditModel(_audit)

    await audit.save()

    return res.status(200).json({ success: true, data: audit })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.updateAudit = async (req, res) => {
  try {
    let fill = await AuditModel.findById(req.params.id)
    const _audit = {
      user_id: req.body.user_id ?? fill.user_id,
      entity_name: req.body.entity_name ?? fill.entity_name,
      record_id: req.body.record_id ?? fill.record_id,
      action_type: req.body.action_type ?? fill.action_type,
      action_time: req.body.action_time
        ? dayjs(req.body.action_time).utc(true).toDate()
        : fill.action_time,
    }
    const audit = await AuditModel.findByIdAndUpdate(req.params.id, _audit, {
      new: true,
      useFindAndModify: false,
    })

    return res.status(200).json({ success: true, data: audit })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.getAudit = async (req, res) => {
  try {
    const audit = await AuditModel.findById(req.params.id)

    return res.status(200).json({ success: true, data: audit })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

controller.getAudits = async (req, res) => {
  try {
    const audits = await AuditModel.find()

    return res.status(200).json({ success: true, data: audits })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

controller.deleteAudit = async (req, res) => {
  try {
    let task = await AuditModel.findById(req.params.id)

    task = await task.remove()

    return res.status(200).json({ success: true, data: task })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

module.exports = controller
