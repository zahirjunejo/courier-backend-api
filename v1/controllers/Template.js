const TemplateModel = require(`./models/TemplateModel`)
const controller = {}

controller.addTemplate = async (req, res) => {
  try {
    const _template = {
      templateName: req.body.templateName,
      xlssSheetUrl: req.file.path,
      thumbnailUrl: req.file.path,
    }
    const template = new TemplateModel(_template)

    await template.save()

    return res.status(200).json({ success: true, data: template })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.updateTemplate = async (req, res) => {
  try {
    let record = await TemplateModel.findById(req.params.id)
    const updateObject = {
      templateName: req.body.templateName ?? record.templateName,
      xlssSheetUrl: req.file.path ?? record.xlssSheetUrl,
      thumbnailUrl: req.file.path ?? record.thumbnailUrl,
    }

    const template = await TemplateModel.findByIdAndUpdate(
      req.params.id,
      updateObject,
      { new: true, useFindAndModify: false }
    )

    return res.status(200).json({
      success: true,
      data: { template },
    })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.getTemplate = async (req, res) => {
  try {
    const template = await TemplateModel.findById(req.params.id)

    return res.status(200).json({ success: true, data: template })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

controller.getTemplates = async (req, res) => {
  try {
    const templates = await TemplateModel.find()

    return res.status(200).json({ success: true, data: templates })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

controller.deleteTemplate = async (req, res) => {
  try {
    let template = await TemplateModel.findById(req.params.id)

    template = await template.remove()

    return res.status(200).json({ success: true, data: template })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

module.exports = controller
