import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Swal from 'sweetalert2'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { editProblem, linkIncidentToProblem, setProblemStatus } from '@/api/problem_api'
import AuditHistory from '../audit/AuditHistory'
import styles from '../itil/itil.module.scss'

const statusClass = {
  OPEN: 'statusNeutral',
  INVESTIGATING: 'statusInfo',
  KNOWN_ERROR: 'statusWarning',
  RESOLVED: 'statusSuccess',
  CLOSED: 'statusSuccess',
  CANCELLED: 'statusDanger',
}

const priorityClass = { 1: 'priorityP1', 2: 'priorityP2', 3: 'priorityP3', 4: 'priorityP4', 5: 'priorityP5' }

const NEXT_ACTIONS = {
  OPEN: [{ label: 'Start Investigating', status: 'INVESTIGATING' }],
  INVESTIGATING: [
    { label: 'Mark Known Error', status: 'KNOWN_ERROR' },
    { label: 'Mark Resolved', status: 'RESOLVED' },
  ],
  KNOWN_ERROR: [{ label: 'Mark Resolved', status: 'RESOLVED' }],
  RESOLVED: [{ label: 'Close Problem', status: 'CLOSED' }],
}

const ProblemDetail = () => {
  const router = useRouter()
  const { id } = router.query
  const details = getUserDetails()
  const [problem, setProblem] = useState(null)
  const [editing, setEditing] = useState(false)
  const [fields, setFields] = useState({ rootCause: '', workaround: '', permanentSolution: '', description: '' })

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
      const response = await fetch(apiUrl + '/auth/problem/get-detail?id=' + id, {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      })
      if (response.status === 401) {
        router.push('/')
        return
      }
      if (response.status === 404) {
        setProblem(null)
        return
      }
      const data = await response.json()
      setProblem(data)
      setFields({
        rootCause: data.rootCause || '',
        workaround: data.workaround || '',
        permanentSolution: data.permanentSolution || '',
        description: data.description || '',
      })
    } catch (error) {
      console.error('Error fetching problem:', error)
    }
  }

  const saveFields = () => {
    editProblem({ id, ...fields }, router, () => {
      setEditing(false)
      getDetail()
    })
  }

  const transition = (status) => {
    if (status === 'CLOSED') {
      Swal.fire({
        title: 'Closure notes',
        input: 'textarea',
        inputPlaceholder: 'Describe how this problem was closed...',
        showCancelButton: true,
        confirmButtonText: 'Close Problem',
      }).then((result) => {
        if (result.isConfirmed && result.value) {
          setProblemStatus(id, status, result.value, router, getDetail)
        }
      })
      return
    }
    setProblemStatus(id, status, null, router, getDetail)
  }

  const addIncident = () => {
    Swal.fire({
      title: 'Link incident',
      input: 'text',
      inputPlaceholder: 'Incident record ID (Mongo _id)',
      showCancelButton: true,
      confirmButtonText: 'Link',
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        linkIncidentToProblem(id, result.value.trim(), router, getDetail)
      }
    })
  }

  useEffect(() => {
    getDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!problem) {
    return (
      <div className={styles.page}>
        <span className={styles.backLink} onClick={() => router.push('/problem')}>
          &larr; Back to Problems
        </span>
        <div className={styles.detailCard}>
          <div className={styles.emptyState}>Loading problem...</div>
        </div>
      </div>
    )
  }

  const actions = NEXT_ACTIONS[problem.status] || []

  return (
    <div className={styles.page}>
      <span className={styles.backLink} onClick={() => router.push('/problem')}>
        &larr; Back to Problems
      </span>

      <div className={styles.detailLayout}>
        <div>
          <div className={styles.detailCard}>
            <div className={styles.detailMeta}>
              <span className={styles[statusClass[problem.status] || 'statusNeutral']}>{problem.status}</span>
              <span className={styles[priorityClass[problem.priority] || 'priorityP3']}>P{problem.priority}</span>
              {problem.knownError && <span className={styles.statusWarning}>KNOWN ERROR</span>}
            </div>
            <h1 className={styles.detailTitle}>
              {problem.problemId}: {problem.title}
            </h1>

            {!editing ? (
              <>
                <div className={styles.detailSection}>
                  <p className={styles.detailSectionLabel}>Description</p>
                  <div className={styles.detailSectionBody}>{problem.description}</div>
                </div>
                <div className={styles.detailSection}>
                  <p className={styles.detailSectionLabel}>Root Cause</p>
                  <div className={styles.detailSectionBody}>{problem.rootCause || '—'}</div>
                </div>
                <div className={styles.detailSection}>
                  <p className={styles.detailSectionLabel}>Workaround</p>
                  <div className={styles.detailSectionBody}>{problem.workaround || '—'}</div>
                </div>
                <div className={styles.detailSection}>
                  <p className={styles.detailSectionLabel}>Permanent Solution</p>
                  <div className={styles.detailSectionBody}>{problem.permanentSolution || '—'}</div>
                </div>
                {problem.closureNotes && (
                  <div className={styles.detailSection}>
                    <p className={styles.detailSectionLabel}>Closure Notes</p>
                    <div className={styles.detailSectionBody}>{problem.closureNotes}</div>
                  </div>
                )}
                {canManage && problem.status !== 'CLOSED' && problem.status !== 'CANCELLED' && (
                  <div className={styles.detailSection}>
                    <button type="button" className={styles.editBtn} onClick={() => setEditing(true)}>
                      Edit RCA / Workaround
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.detailSection}>
                <div className={styles.formGrid}>
                  <div className={`${styles.formField} ${styles.full}`}>
                    <label className={styles.formLabel}>Description</label>
                    <textarea
                      className={styles.formTextarea}
                      value={fields.description}
                      onChange={(e) => setFields({ ...fields, description: e.target.value })}
                    />
                  </div>
                  <div className={`${styles.formField} ${styles.full}`}>
                    <label className={styles.formLabel}>Root Cause</label>
                    <textarea
                      className={styles.formTextarea}
                      value={fields.rootCause}
                      onChange={(e) => setFields({ ...fields, rootCause: e.target.value })}
                    />
                  </div>
                  <div className={`${styles.formField} ${styles.full}`}>
                    <label className={styles.formLabel}>Workaround</label>
                    <textarea
                      className={styles.formTextarea}
                      value={fields.workaround}
                      onChange={(e) => setFields({ ...fields, workaround: e.target.value })}
                    />
                  </div>
                  <div className={`${styles.formField} ${styles.full}`}>
                    <label className={styles.formLabel}>Permanent Solution</label>
                    <textarea
                      className={styles.formTextarea}
                      value={fields.permanentSolution}
                      onChange={(e) => setFields({ ...fields, permanentSolution: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button type="button" className={styles.submitBtn} onClick={saveFields}>
                    Save
                  </button>
                  <button type="button" className={styles.cancelBtn} onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          {canManage && actions.length > 0 && (
            <div className={styles.sidePanel} style={{ marginBottom: 16 }}>
              <p className={styles.sidePanelTitle}>Actions</p>
              <div className={styles.actionBtnRow}>
                {actions.map((a) => (
                  <button key={a.status} type="button" className={styles.actionBtn} onClick={() => transition(a.status)}>
                    {a.label}
                  </button>
                ))}
                {problem.status !== 'CLOSED' && problem.status !== 'CANCELLED' && (
                  <button
                    type="button"
                    className={styles.actionBtnDanger}
                    onClick={() => transition('CANCELLED')}
                  >
                    Cancel Problem
                  </button>
                )}
              </div>
            </div>
          )}

          <div className={styles.sidePanel} style={{ marginBottom: 16 }}>
            <p className={styles.sidePanelTitle}>Linked Incidents ({problem.linkedIncidents?.length || 0})</p>
            <div className={styles.chipList}>
              {(problem.linkedIncidents || []).map((inc) => (
                <div
                  key={inc.id}
                  className={styles.chip}
                  onClick={() => router.push(`/edit-incident/view/${inc.id}`)}
                >
                  <span className={styles.chipTitle}>{inc.incidentId}</span>
                  <span className={styles.email}>{inc.status}</span>
                </div>
              ))}
              {(!problem.linkedIncidents || problem.linkedIncidents.length === 0) && (
                <span className={styles.email}>No incidents linked yet</span>
              )}
            </div>
            {canManage && (
              <button type="button" className={styles.editBtn} style={{ marginTop: 12 }} onClick={addIncident}>
                + Link Incident
              </button>
            )}
          </div>

          <div className={styles.sidePanel}>
            <p className={styles.sidePanelTitle}>Linked Changes ({problem.linkedChanges?.length || 0})</p>
            <div className={styles.chipList}>
              {(problem.linkedChanges || []).map((c) => (
                <div key={c.id} className={styles.chip} onClick={() => router.push(`/change/${c.id}`)}>
                  <span className={styles.chipTitle}>{c.changeId}</span>
                  <span className={styles.email}>{c.status}</span>
                </div>
              ))}
              {(!problem.linkedChanges || problem.linkedChanges.length === 0) && (
                <span className={styles.email}>No changes linked yet</span>
              )}
            </div>
          </div>

          <AuditHistory entityType="Problem" entityId={problem.id} />
        </div>
      </div>
    </div>
  )
}

export default ProblemDetail
