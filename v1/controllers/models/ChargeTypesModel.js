const mongoose = require(`mongoose`)

mongoose.Promise = global.Promise
const { Schema } = mongoose

const chargeTypesSchema = Schema({
  name: { type: String, require: true },
  stop_rate: { type: Number },
  mileage_rate: { type: Number },
})

chargeTypesSchema.set(`toJSON`, {})
chargeTypesSchema.statics.checkExistingField = async (field, val) => {
  const check = await chargeTypesModel.findOne({ [`${field}`]: val })

  return check
}

const chargeTypesModel = mongoose.model(`ChargeType`, chargeTypesSchema)

module.exports = chargeTypesModel
