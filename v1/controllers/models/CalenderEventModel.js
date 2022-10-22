const mongoose = require(`mongoose`)
const idValidator = require('mongoose-id-validator')

mongoose.Promise = global.Promise
const { Schema } = mongoose

const CalendarEventSchema = Schema({
  title: { type: String, required: true },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  color: { type: String, required: true },
  allDay: { type: Boolean, required: true },
  descriptiveHtml: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }, //  Timestamp
  updatedAt: { type: Date, default: Date.now }, //  Timestamp
})
CalendarEventSchema.plugin(idValidator)
CalendarEventSchema.pre(`save`, function (next) {
  this.updatedAt = Date.now()

  return next()
})
CalendarEventSchema.set(`toJSON`, {})
CalendarEventSchema.statics.checkExistingField = async (field, value) => {
  const checkField = await CalendarEventModel.findOne({ [`${field}`]: value })

  return checkField
}
const CalendarEventModel = mongoose.model(`CalendarEvent`, CalendarEventSchema)

// Export function to create CalendarEvent model class
module.exports = CalendarEventModel
