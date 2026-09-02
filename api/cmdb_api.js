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

export const createCI = (ci, router, onSuccess) =>
  postJson('/auth/itil/cmdb/ci-create', ci, router, (data) => {
    Swal.fire('Success', data.message, 'success')
    onSuccess && onSuccess(data)
  })

export const editCI = (ci, router, onSuccess) =>
  postJson('/auth/itil/cmdb/ci-edit?id=' + ci.id, ci, router, onSuccess)

export const createRelationship = (sourceId, targetId, relationshipType, router, onSuccess) =>
  postJson('/auth/itil/cmdb/relationship-create', { sourceId, targetId, relationshipType }, router, onSuccess)

export const deleteRelationship = (id, router, onSuccess) =>
  postJson('/auth/itil/cmdb/relationship-delete?id=' + id, {}, router, onSuccess)

export const linkCIToEntity = (ciId, entityType, entityId, router, onSuccess) =>
  postJson('/auth/itil/cmdb/link-entity?id=' + ciId, { entityType, entityId }, router, onSuccess)
