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
    if (data.statusCode === 409) {
      Swal.fire('Oops!', '' + data.message + '', 'warning')
      return null
    }
    onSuccess && onSuccess(data)
    return data
  } catch (error) {
    console.error('Error calling', path, error)
    return null
  }
}

export const runReport = (spec, router, onSuccess) => postJson('/auth/reports/run', spec, router, onSuccess)

export const saveReport = (spec, router, onSuccess) => postJson('/auth/reports/save', spec, router, onSuccess)

export const deleteReport = (id, router, onSuccess) => postJson('/auth/reports/delete?id=' + id, {}, router, onSuccess)
