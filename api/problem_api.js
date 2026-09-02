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

export const createProblem = (problem, router, onSuccess) =>
  postJson('/auth/problem/create', problem, router, (data) => {
    Swal.fire('Success', data.message, 'success')
    onSuccess && onSuccess(data)
  })

export const createProblemFromIncident = (payload, router, onSuccess) =>
  postJson('/auth/problem/create-from-incident', payload, router, (data) => {
    Swal.fire('Success', data.message, 'success')
    onSuccess && onSuccess(data)
  })

export const editProblem = (problem, router, onSuccess) =>
  postJson('/auth/problem/edit?id=' + problem.id, problem, router, onSuccess)

export const linkIncidentToProblem = (problemId, incidentId, router, onSuccess) =>
  postJson('/auth/problem/link-incident?id=' + problemId, { incidentId }, router, onSuccess)

export const setProblemStatus = (id, status, closureNotes, router, onSuccess) =>
  postJson('/auth/problem/set-status?id=' + id, { status, closureNotes }, router, onSuccess)
