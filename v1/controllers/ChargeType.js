const ChargeTypesModel = require(`./models/ChargeTypesModel`)
const controller = {}

controller.addChargeType = async (req, res) => {
  try {
    const _chargeType = {
      name: req.body.name,
      stop_rate: req.body.stop_rate,
      mileage_rate: req.body.mileage_rate,
    }
    const chargeType = new ChargeTypesModel(_chargeType)
    await chargeType.save()
    return res.status(200).json({ success: true, data: chargeType })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.updateChargeType = async (req, res) => {
  try {
    let fill = await ChargeTypesModel.findById(req.params.id)
    const _chargeType = {
      name: req.body.name ?? fill.name,
      stop_rate: req.body.stop_rate ?? fill.stop_rate,
      mileage_rate: req.body.mileage_rate ?? fill.mileage_rate,
    }
    const chargeType = await ChargeTypesModel.findByIdAndUpdate(
      req.params.id,
      _chargeType,
      {
        new: true,
        useFindAndModify: false,
      }
    )

    return res.status(200).json({ success: true, data: chargeType })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.getChargeType = async (req, res) => {
  try {
    const chargeType = await ChargeTypesModel.findById(req.params.id)
    return res.status(200).json({ success: true, data: chargeType })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

controller.getChargeTypes = async (req, res) => {
  try {
    const chargeType = await ChargeTypesModel.find()
    return res.status(200).json({ success: true, data: chargeType })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

controller.deleteChargeType = async (req, res) => {
  try {
    let chargeType = await ChargeTypesModel.findById(req.params.id)
    chargeType = await chargeType.remove()
    return res.status(200).json({ success: true, data: chargeType })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

module.exports = controller
