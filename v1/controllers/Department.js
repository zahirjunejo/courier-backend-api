const DepartmentModel = require(`./models/DepartmentModel`)
const GeolocationModel = require(`./models/GeolocationModel`)
const controller = {}

controller.addDepartment = async (req, res) => {
  try {
    const _department = {
      departmentName: req.body.departmentName,
      departmentEmail: req.body.departmentEmail,
      departmentAddress: req.body.departmentAddress,
      departmentPhoneNo: req.body.departmentPhoneNo,
      departmentContactPersonName: req.body.departmentContactPersonName,
      requiresPhotoSignature: req.body.requiresPhotoSignature,
    }
    const _departmentLocation = {
      Latitude: req.body.departmentLocation?.Latitude || 0,
      Longitude: req.body.departmentLocation?.Longitude || 0,
    }
    const departmentLocation = new GeolocationModel(_departmentLocation)

    await departmentLocation.save()
    const department = new DepartmentModel(_department)

    department.departmentLocation = departmentLocation._id
    await department.save()

    return res
      .status(200)
      .json({ success: true, data: { department, departmentLocation } })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.addDepartments = async (req, res) => {
  try {
    let _departments = req.body
    let departmentRes = []
    departmentRes = await Promise.all(
      _departments.map(async (element) => {
        const _department = {
          departmentName: element.departmentName,
          departmentEmail: element.departmentEmail,
          departmentAddress: element.departmentAddress,
          departmentPhoneNo: element.departmentPhoneNo,
          departmentContactPersonName: element.departmentContactPersonName,
          requiresPhotoSignature: element.requiresPhotoSignature,
        }
        const _departmentLocation = {
          Latitude: element.departmentLocation.Latitude,
          Longitude: element.departmentLocation.Longitude,
        }

        const departmentLocation = new GeolocationModel(_departmentLocation)
        await departmentLocation.save()
        let department = new DepartmentModel(_department)
        department.departmentLocation = departmentLocation._id
        department = await department.save()
        return department
      })
    )

    return res.status(200).json({ success: true, data: departmentRes })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.UpdateDepartment = async (req, res) => {
  try {
    let record = await DepartmentModel.findById(req.params.id)
      .populate('departmentLocation')
      .exec()
    const updateObject = {
      departmentName: req.body.departmentName ?? record.departmentName,
      departmentEmail: req.body.departmentEmail ?? record.departmentEmail,
      departmentAddress: req.body.departmentAddress ?? record.departmentAddress,
      departmentPhoneNo: req.body.departmentPhoneNo ?? record.departmentPhoneNo,
      departmentContactPersonName:
        req.body.departmentContactPersonName ??
        record.departmentContactPersonName,
      requiresPhotoSignature:
        req.body.requiresPhotoSignature ?? record.requiresPhotoSignature,
    }

    const department = await DepartmentModel.findByIdAndUpdate(
      req.params.id,
      updateObject,
      { new: true, useFindAndModify: false }
    )
    record.departmentLocation = await GeolocationModel.findByIdAndUpdate(
      department.departmentLocation,
      {
        Latitude:
          req.body.departmentLocation.Latitude ??
          record.departmentLocation?.Latitude,
        Longitude:
          req.body.departmentLocation.Longitude ??
          record.departmentLocation?.Longitude,
      },
      { new: true, useFindAndModify: false }
    )

    return res.status(200).json({
      success: true,
      data: { department },
    })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.GetDepartment = async (req, res) => {
  try {
    const department = await DepartmentModel.findById(req.params.id)
      .populate('departmentLocation')
      .exec()
    return res.status(200).json({ success: true, data: department })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

controller.GetDepartments = async (req, res) => {
  try {
    const department = await DepartmentModel.find()
      .populate('departmentLocation')
      .exec()
    return res.status(200).json({ success: true, data: department })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

controller.DeleteDepartment = async (req, res) => {
  try {
    let department = await DepartmentModel.findById(req.params.id)
    department = await department.remove()
    return res.status(200).json({ success: true, data: department })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex })
  }
}

module.exports = controller
