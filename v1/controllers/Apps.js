//
// Apps uses routes use to POST and GET resources from the Mongo DB
//
const AppsModel = require(`./models/AppsModel`)
const controller = {}

const validateName = async function (name) {
  let result = false
  // eslint-disable-next-line id-length
  const p = AppsModel.findOne({ name }).exec()

  await p.then((app) => {
    if (app === null) {
      result = true
    }
  })

  return result
}

// POST API_IP/VERSION/apps/
// Create a NEW App
// Add
controller.Add = async function (req, res) {
  const app = {
    userId: req.user.userId,
    name: req.body.name,
    password: req.body.password,
    picture: req.body.picture,
    permissions: req.body.permissions,
  }

  if ((await validateName(app.name)) === false) {
    return res.status(500).json({ error: `That app name already exists` })
  }

  // Execute a query
  const model = new AppsModel(app)
  const promise = model.save()

  promise
    // eslint-disable-next-line no-shadow
    .then((app) => {
      res.json(app)
    })
    .catch((ex) => {
      res.status(500).json(ex)
    })
}

module.exports = controller
