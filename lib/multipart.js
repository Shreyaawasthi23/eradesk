import formidable from 'formidable'
import fs from 'fs'

export const apiRouteConfig = { api: { bodyParser: false } }

export async function parseMultipart(req) {
  const form = formidable({})
  const [fields, files] = await form.parse(req)

  const flatFields = {}
  for (const key of Object.keys(fields)) flatFields[key] = fields[key][0]

  const flatFiles = {}
  for (const key of Object.keys(files)) {
    const file = files[key][0]
    flatFiles[key] = {
      originalFilename: file.originalFilename,
      mimetype: file.mimetype,
      buffer: fs.readFileSync(file.filepath),
    }
  }

  return { fields: flatFields, files: flatFiles }
}
