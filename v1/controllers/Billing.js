const pdf = require('html-pdf')
const mongoose = require('mongoose')
const controller = {}
const getTable = (table_name, data, table_sum) => {
  const nullValue = '-'
  const keys = data
    .map((x) => Object.keys(x))
    .join(',')
    .split(',')
  const headers = [...new Set(keys)]
  const columns = headers.map((header) => `<th>${header}</th>`).join('\n')
  const rows = data
    .map(
      (tr) =>
        `<tr>${headers
          .map((td) => `<td>${tr[td] ? tr[td] : nullValue}</td>`)
          .join('\n')}</tr>`
    )
    .join('\n')

  return `
  <div style="clear: both">
    <h3 style="float: left">${table_name || ''}</h3>
    <h3 style="float: right">${table_sum || ''}</h3>     
  </div>
    
    <table>
        <tr>
          ${columns}
        </tr>
        ${rows}
    </table>
    <br>`
}

controller.create = async (req, res) => {
  try {
    const options = {
      format: 'A4',
      orientation: 'portrait',
      header: {
        height: '30mm',
        contents: `<div style="text-align: center;">Backend</div>`,
      },
    }

    const css = `            
      table {
        font-family: arial, sans-serif;
        border-collapse: collapse;
        width: 100%;
        border:1px solid;
        border-color: #b5b5b5;
      }
      
      th{
        border-top: 1px solid;
        background: #dbdbdb;
      }

      td, th {
        text-align: left;
        padding: 8px;
      }`

    const tables = req.body
    let html = `<html>
                            <head>
                            <style>
                            ${css}
                            </style>
                            </head>
                            <body>
                             ${tables.map((table) =>
                               getTable(
                                 table.table_name,
                                 table.table_data,
                                 table.table_sum
                               )
                             )}
                            </body>
                    </html>`
    const id = mongoose.Types.ObjectId()
    pdf
      .create(html, options)
      .toFile(`files\\${id}.pdf`, function (err, response) {
        if (err) return console.log(err)

        return res.status(200).download(`files\\${id}.pdf`)
      })
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

controller.downloadPDF = async (req, res) => {
  try {
    return res.status(200).download(`files\\${req.params.id}`)
  } catch (ex) {
    return res.status(502).json({ success: false, error: ex.message })
  }
}

module.exports = controller
