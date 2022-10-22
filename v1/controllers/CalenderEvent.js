const CalenderEventModel = require(`./models/CalenderEventModel`)
const dayjs = require('dayjs')
const customParseFormat = require('dayjs/plugin/customParseFormat')
dayjs.extend(customParseFormat)

const controller = {}

controller.addCalendarEvent = async (req, res) => {
  try {
    const _event = {
      title: req.body.title,
      start: dayjs(req.body.start, 'DD/MM/YYYY').utc(true).toDate(),
      end: dayjs(req.body.end, 'DD/MM/YYYY').utc(true).endOf('day').toDate(),
      color: req.body.color,
      allDay: req.body.allDay,
      descriptiveHtml: req.body.descriptiveHtml,
    }

    const event = new CalenderEventModel(_event)

    await event.save()

    return res.status(200).json({ success: true, data: event })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.updateCalendarEvent = async (req, res) => {
  try {
    let fill = await CalenderEventModel.findById(req.params.id)
    const updateObject = {
      title: req.body.title ?? fill.title,
      start: req.body.start
        ? dayjs(req.body.start, 'DD/MM/YYYY').utc(true).toDate()
        : fill.start,
      end: req.body.end
        ? dayjs(req.body.end, 'DD/MM/YYYY').utc(true).endOf('day').toDate()
        : fill.end,
      color: req.body.color ?? fill.color,
      allDay: req.body.allDay ?? fill.allDay,
      descriptiveHtml: req.body.descriptiveHtml ?? fill.descriptiveHtml,
    }

    const event = await CalenderEventModel.findByIdAndUpdate(
      req.params.id,
      updateObject,
      {
        new: true,
        useFindAndModify: false,
      }
    )

    return res.status(200).json({ succes: true, data: event })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.getCalendarEvent = async (req, res) => {
  try {
    const event = await CalenderEventModel.findById(req.params.id)

    return res.status(200).json({ success: true, data: event })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

controller.getCalendarEventByDate = async (req, res) => {
  try {
    if (
      isNaN(req.params.year) ||
      isNaN(req.params.month) ||
      isNaN(req.params.day)
    ) {
      throw 'Nice try but the dates need to be in the proper format'
    }

    const day = dayjs(
      `${req.params.year}-${req.params.month}-${req.params.day}`
    ).utc(true)

    const events = await CalenderEventModel.find({
      start: {
        $gte: day.startOf('day').toDate(),
        $lte: day.endOf('day').toDate(),
      },
    })

    return res.status(200).json({ success: true, data: events })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

controller.deleteCalendarEvent = async (req, res) => {
  try {
    const event = await CalenderEventModel.findByIdAndDelete(req.params.id)

    return res.status(200).json({ success: true, data: event })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

module.exports = controller
