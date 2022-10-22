const WeeklyRouteModel = require('../controllers/models/WeeklyRoute')
const controller = {}

controller.addWeeklyRoute = async (req, res) => {
  try {
    const _weekleyRoute = {
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      customer: req.body.customer,
      department: req.body.department,
      days: req.body.days,
      tasks: req.body.tasks,
      driverId: req.body.driverId,
      createdByUser: req.user._id,
    }

    const weeklyRoute = new WeeklyRouteModel(_weekleyRoute)
    await weeklyRoute.save()
    return res.status(200).json({ success: true, data: weeklyRoute })
  } catch (err) {
    return res.status(502).json({ success: false, error: err.message })
  }
}

controller.updateWeeklyRoute = async (req, res) => {
  try {
    let record = await WeeklyRouteModel.findById(req.params.id)
    const _updateObject = {
      startTime: req.body.startTime ?? record.startTime,
      endTime: req.body.endTime ?? record.endTime,
      customer: req.body.customer ?? record.customer,
      department: req.body.department ?? record.department,
      days: req.body.days ?? record.days,
      tasks: req.body.tasks ?? record.tasks,
      driverId: req.body.driverId ?? record.driverId,
    }

    const weeklyRoute = await WeeklyRouteModel.findByIdAndUpdate(
      req.params.id,
      _updateObject,
      { new: true, useFindAndModify: false }
    )
    return res.status(200).json({ success: true, data: weeklyRoute })
  } catch (err) {
    return res.status(502).json({ success: false, error: err.message })
  }
}

controller.getWeeklyRoute = async (req, res) => {
  const weeklyRoute = await WeeklyRouteModel.findById(req.params.id)
  return res.status(200).json({ success: true, data: weeklyRoute })
}

controller.getWeeklyRoutes = async (req, res) => {
  const weeklyRoutes = await WeeklyRouteModel.find()
    .populate({ path: 'tasks', populate: ['addressLocation'] })
    .exec()
  return res.status(200).json({ success: true, data: weeklyRoutes })
}

controller.deleteWeeklyRoutes = async (req, res) => {
  try {
    const weeklyRoute = await WeeklyRouteModel.findByIdAndDelete(req.params.id)
    return res.status(200).json({ success: true, data: weeklyRoute })
  } catch (err) {
    return res.status(502).json({ success: false, error: err.message })
  }
}

module.exports = controller
