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

export const createChange = (change, router, onSuccess) =>
  postJson('/auth/itil/change/create', change, router, (data) => {
    Swal.fire('Success', data.message, 'success')
    onSuccess && onSuccess(data)
  })

export const editChange = (change, router, onSuccess) =>
  postJson('/auth/itil/change/edit?id=' + change.id, change, router, onSuccess)

export const submitChangeForApproval = (id, router, onSuccess) =>
  postJson('/auth/itil/change/submit-for-approval?id=' + id, {}, router, onSuccess)

export const decideChange = (id, decision, comment, router, onSuccess) =>
  postJson('/auth/itil/change/decide?id=' + id, { decision, comment }, router, onSuccess)

export const setChangeStatus = (id, status, extra, router, onSuccess) =>
  postJson('/auth/itil/change/set-status?id=' + id, { status, ...extra }, router, onSuccess)
