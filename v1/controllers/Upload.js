const UploadsModel = require(`./models/UploadsModel`)
const DriverModel = require('./models/DriverModel')

const controller = {}

controller.addUpload = async (req, res) => {
  try {
    const _upload = {
      signatureUrls: req.files['signatures']?.map((x) => x.path),
      photoUrls: req.files['photos']?.map((x) => x.path),
      attachmentUrls: req.files['attachments']?.map((x) => x.path),
    }

    const upload = new UploadsModel(_upload)

    await upload.save()

    return res.status(200).json({
      success: true,
      data: { upload },
    })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.updateUpload = async (req, res) => {
  try {
    let record = await UploadsModel.findById(req.params.id)
    const _upload = {
      signatureUrls:
        req.files['signatures']?.map((x) => x.path) ?? record.signatureUrls,
      photoUrls: req.files['photos']?.map((x) => x.path) ?? record.photoUrls,
      attachmentUrls:
        req.files['attachments']?.map((x) => x.path) ?? record.attachmentUrls,
    }

    const upload = await UploadsModel.findByIdAndUpdate(
      req.params.id,
      _upload,
      {
        new: true,
        useFindAndModify: false,
      }
    )

    return res.status(200).json({
      success: true,
      data: { upload },
    })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.getUpload = async (req, res) => {
  try {
    const task = await UploadsModel.findById(req.params.id)

    return res.status(200).json({ success: true, data: task })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

controller.getUploadFile = async (req, res) => {
  try {
    var options = {
      root: 'uploads',
      dotfiles: 'deny',
      headers: {
        'x-timestamp': Date.now(),
        'x-sent': true,
      },
    }

    var fileName = req.params.id
    return res.status(200).sendFile(fileName, options, function (err) {
      if (err) {
        return res.status(404).send()
      }
    })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.getUploadsByDriver = async (req, res) => {
  try {
    const driver = await DriverModel.findById(req.params.driverId)
      .populate('uploads')
      .exec()

    return res.status(200).json({
      success: true,
      data: { uploads: driver.uploads },
    })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.deleteUpload = async (req, res) => {
  try {
    let task = await UploadsModel.findById(req.params.id)

    task = await task.remove()

    return res.status(200).json({ success: true, data: task })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

module.exports = controller
