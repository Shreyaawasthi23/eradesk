import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import Swal from 'sweetalert2'

const authHeaders = (extra = {}) => {
  const details = getUserDetails()
  const headers = new Headers()
  headers.append('X-Tenant', '' + tenant + '')
  headers.append('Authorization', 'Bearer ' + details?.token + '')
  Object.entries(extra).forEach(([k, v]) => headers.append(k, v))
  return headers
}

const postJson = async (path, body, router, onSuccess) => {
  try {
    const response = await fetch(apiUrl + path, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
      redirect: 'follow',
    })
    if (response.status === 401) {
      router.push('/')
      return
    }
    const data = await response.json()
    if (data.statusCode === 200) {
      onSuccess && onSuccess(data)
    } else {
      Swal.fire('Oops!', '' + data.message + '', 'warning')
    }
    return data
  } catch (error) {
    console.error('Error calling', path, error)
  }
}

export const createSurveyTemplate = (template, router, onSuccess) =>
  postJson('/auth/survey/template-create', template, router, onSuccess)

export const editSurveyTemplate = (template, router, onSuccess) =>
  postJson('/auth/survey/template-edit?id=' + template.id, template, router, onSuccess)
