import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Swal from 'sweetalert2'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { editCI, createRelationship, deleteRelationship, linkCIToEntity } from '@/api/cmdb_api'
import styles from '../itil/itil.module.scss'

const statusClass = {
  ACTIVE: 'statusSuccess',
  INACTIVE: 'statusNeutral',
  UNDER_MAINTENANCE: 'statusWarning',
  RETIRED: 'statusDanger',
}

const RELATIONSHIP_TYPES = ['HOSTS', 'USES', 'DEPENDS_ON', 'CONNECTED_TO', 'RUNS_ON']

const LINK_TYPES = [
  { key: 'incident', label: 'Incident', listKey: 'linkedIncidents', idField: 'incidentId', route: '/edit-incident/view' },
  { key: 'problem', label: 'Problem', listKey: 'linkedProblems', idField: 'problemId', route: '/problem' },
  { key: 'change', label: 'Change', listKey: 'linkedChanges', idField: 'changeId', route: '/change' },
]

const CIDetail = () => {
  const router = useRouter()
  const { id } = router.query
  const details = getUserDetails()
  const [ci, setCi] = useState(null)
  const [graph, setGraph] = useState(null)
  const [editing, setEditing] = useState(false)
  const [statusValue, setStatusValue] = useState('')

  const canManage =
    details?.roles?.includes('ROLE_ADMIN') ||
    details?.roles?.includes('ROLE_USER') ||
    details?.roles?.includes('ROLE_MODERATOR')

  const getDetail = async () => {
    if (!id) return
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    try {
      const response = await fetch(apiUrl + '/auth/cmdb/get-detail?id=' + id, {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      })
      if (response.status === 401) {
        router.push('/')
        return
      }
      if (response.status === 404) {
        setCi(null)
        return
      }
      const data = await response.json()
      setCi(data)
      setStatusValue(data.status)
    } catch (error) {
      console.error('Error fetching CI:', error)
    }
  }

  const getGraph = async () => {
    if (!id) return
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    try {
      const response = await fetch(apiUrl + '/auth/cmdb/relationship-graph?id=' + id, {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      })
      if (response.status === 401) return
      const data = await response.json()
      setGraph(data)
    } catch (error) {
      console.error('Error fetching CI graph:', error)
    }
  }

  const saveStatus = () => {
    editCI({ id, status: statusValue }, router, () => {
      setEditing(false)
      getDetail()
    })
  }

  const addRelationship = () => {
    Swal.fire({
      title: 'Add relationship',
      html:
        '<input id="swal-target" class="swal2-input" placeholder="Target CI ID (Mongo _id)">' +
        `<select id="swal-type" class="swal2-select">${RELATIONSHIP_TYPES.map((t) => `<option value="${t}">${t}</option>`).join('')}</select>`,
      showCancelButton: true,
      confirmButtonText: 'Link',
      preConfirm: () => {
        const targetId = document.getElementById('swal-target').value.trim()
        const relationshipType = document.getElementById('swal-type').value
        if (!targetId) {
          Swal.showValidationMessage('Target CI ID is required')
          return false
        }
        return { targetId, relationshipType }
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        createRelationship(id, result.value.targetId, result.value.relationshipType, router, () => {
          getGraph()
        })
      }
    })
  }

  const removeRelationship = (relId) => {
    deleteRelationship(relId, router, getGraph)
  }

  const addLink = (entityType) => {
    Swal.fire({
      title: `Link ${entityType}`,
      input: 'text',
      inputPlaceholder: `${entityType} record ID (Mongo _id)`,
      showCancelButton: true,
      confirmButtonText: 'Link',
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        linkCIToEntity(id, entityType, result.value.trim(), router, getDetail)
      }
    })
  }

  useEffect(() => {
    getDetail()
    getGraph()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!ci) {
    return (
      <div className={styles.page}>
        <span className={styles.backLink} onClick={() => router.push('/cmdb')}>
          &larr; Back to CMDB
        </span>
        <div className={styles.detailCard}>
          <div className={styles.emptyState}>Loading configuration item...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <span className={styles.backLink} onClick={() => router.push('/cmdb')}>
        &larr; Back to CMDB
      </span>

      <div className={styles.detailLayout}>
        <div>
          <div className={styles.detailCard}>
            <div className={styles.detailMeta}>
              <span className={styles[statusClass[ci.status] || 'statusNeutral']}>{ci.status}</span>
              <span className={styles.typeBadge}>{ci.type?.replace('_', ' ')}</span>
            </div>
            <h1 className={styles.detailTitle}>
              {ci.ciId}: {ci.name}
            </h1>

            <div className={styles.detailSection}>
              <p className={styles.detailSectionLabel}>Details</p>
              <div className={styles.detailSectionBody}>
                {ci.ipAddress && <div>IP: {ci.ipAddress}</div>}
                {ci.macAddress && <div>MAC: {ci.macAddress}</div>}
                {ci.operatingSystem && <div>OS: {ci.operatingSystem}</div>}
                {ci.version && <div>Version: {ci.version}</div>}
                {ci.owner && <div>Owner: {ci.owner}</div>}
                {ci.vendor && <div>Vendor: {ci.vendor}</div>}
                {ci.description && <div>{ci.description}</div>}
              </div>
            </div>

            {ci.asset && (
              <div className={styles.detailSection}>
                <p className={styles.detailSectionLabel}>Linked Asset</p>
                <div className={styles.detailSectionBody}>
                  {ci.asset.make} {ci.asset.model} — S/N {ci.asset.serialNumber}
                </div>
              </div>
            )}

            {canManage && (
              <div className={styles.detailSection}>
                {!editing ? (
                  <button type="button" className={styles.editBtn} onClick={() => setEditing(true)}>
                    Change Status
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select className={styles.formInput} value={statusValue} onChange={(e) => setStatusValue(e.target.value)}>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                      <option value="RETIRED">Retired</option>
                    </select>
                    <button type="button" className={styles.submitBtn} onClick={saveStatus}>
                      Save
                    </button>
                    <button type="button" className={styles.cancelBtn} onClick={() => setEditing(false)}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={styles.sidePanel} style={{ marginTop: 16 }}>
            <p className={styles.sidePanelTitle}>Relationship Graph</p>
            <div className={styles.chipList}>
              {(graph?.relationships || []).map((r) => {
                const isSource = r.sourceId === id
                const neighborId = isSource ? r.targetId : r.sourceId
                const neighbor = graph?.neighbors?.find((n) => n.id === neighborId)
                return (
                  <div key={r.id} className={styles.chip}>
                    <span className={styles.chipTitle}>
                      {isSource ? `→ ${r.relationshipType} → ` : `← ${r.relationshipType} ← `}
                      {neighbor ? neighbor.name : neighborId}
                    </span>
                    {canManage && (
                      <button
                        type="button"
                        className={styles.editBtn}
                        onClick={() => removeRelationship(r.id)}
                        style={{ marginLeft: 8 }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )
              })}
              {(!graph?.relationships || graph.relationships.length === 0) && (
                <span className={styles.email}>No relationships yet</span>
              )}
            </div>
            {canManage && (
              <button type="button" className={styles.editBtn} style={{ marginTop: 12 }} onClick={addRelationship}>
                + Add Relationship
              </button>
            )}
          </div>
        </div>

        <div>
          {LINK_TYPES.map((lt) => (
            <div key={lt.key} className={styles.sidePanel} style={{ marginBottom: 16 }}>
              <p className={styles.sidePanelTitle}>
                {lt.label}s ({ci[lt.listKey]?.length || 0})
              </p>
              <div className={styles.chipList}>
                {(ci[lt.listKey] || []).map((entity) => (
                  <div
                    key={entity.id}
                    className={styles.chip}
                    onClick={() => router.push(`${lt.route}/${entity.id}`)}
                  >
                    <span className={styles.chipTitle}>{entity[lt.idField]}</span>
                    <span className={styles.email}>{entity.status}</span>
                  </div>
                ))}
                {(!ci[lt.listKey] || ci[lt.listKey].length === 0) && <span className={styles.email}>None linked</span>}
              </div>
              {canManage && (
                <button type="button" className={styles.editBtn} style={{ marginTop: 12 }} onClick={() => addLink(lt.key)}>
                  + Link {lt.label}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CIDetail
