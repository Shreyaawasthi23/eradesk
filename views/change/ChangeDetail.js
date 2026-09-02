import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Swal from 'sweetalert2'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { editChange, submitChangeForApproval, decideChange, setChangeStatus } from '@/api/change_api'
import styles from '../itil/itil.module.scss'

const statusClass = {
  DRAFT: 'statusNeutral',
  PENDING_APPROVAL: 'statusWarning',
  APPROVED: 'statusInfo',
  REJECTED: 'statusDanger',
  SCHEDULED: 'statusPurple',
  IN_PROGRESS: 'statusInfo',
  IMPLEMENTED: 'statusSuccess',
  REVIEWED: 'statusSuccess',
  CLOSED: 'statusSuccess',
  CANCELLED: 'statusDanger',
}

const priorityClass = { 1: 'priorityP1', 2: 'priorityP2', 3: 'priorityP3', 4: 'priorityP4', 5: 'priorityP5' }

const toDateTimeLocal = (date) => (date ? new Date(date).toISOString().slice(0, 16) : '')

const ChangeDetail = () => {
  const router = useRouter()
  const { id } = router.query
  const details = getUserDetails()
  const [change, setChange] = useState(null)
  const [scheduling, setScheduling] = useState(false)
  const [schedule, setSchedule] = useState({ scheduledStart: '', scheduledEnd: '' })

  const canManage =
    details?.roles?.includes('ROLE_ADMIN') ||
    details?.roles?.includes('ROLE_USER') ||
    details?.roles?.includes('ROLE_MODERATOR')
  const canApprove = details?.roles?.includes('ROLE_ADMIN') || details?.roles?.includes('ROLE_MODERATOR')

  const getDetail = async () => {
    if (!id) return
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    try {
      const response = await fetch(apiUrl + '/auth/itil/change/get-detail?id=' + id, {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      })
      if (response.status === 401) {
        router.push('/')
        return
      }
      if (response.status === 404) {
        setChange(null)
        return
      }
      const data = await response.json()
      setChange(data)
      setSchedule({
        scheduledStart: toDateTimeLocal(data.scheduledStart),
        scheduledEnd: toDateTimeLocal(data.scheduledEnd),
      })
    } catch (error) {
      console.error('Error fetching change:', error)
    }
  }

  const submitForApproval = () => {
    submitChangeForApproval(id, router, getDetail)
  }

  const decide = (decision) => {
    Swal.fire({
      title: decision === 'APPROVED' ? 'Approve this change?' : 'Reject this change?',
      input: 'textarea',
      inputPlaceholder: 'Comment (optional)',
      showCancelButton: true,
      confirmButtonText: decision === 'APPROVED' ? 'Approve' : 'Reject',
    }).then((result) => {
      if (result.isConfirmed) {
        decideChange(id, decision, result.value || '', router, getDetail)
      }
    })
  }

  const saveSchedule = () => {
    editChange(
      { id, scheduledStart: schedule.scheduledStart, scheduledEnd: schedule.scheduledEnd },
      router,
      () => {
        setScheduling(false)
        getDetail()
      },
    )
  }

  const transition = (status) => {
    if (status === 'SCHEDULED') {
      if (!schedule.scheduledStart) {
        setScheduling(true)
        return
      }
      saveSchedule()
      setChangeStatus(id, 'SCHEDULED', {}, router, getDetail)
      return
    }
    if (status === 'REVIEWED') {
      Swal.fire({
        title: 'Review notes',
        input: 'textarea',
        inputPlaceholder: 'Post-implementation review...',
        showCancelButton: true,
        confirmButtonText: 'Mark Reviewed',
      }).then((result) => {
        if (result.isConfirmed && result.value) {
          setChangeStatus(id, 'REVIEWED', { reviewNotes: result.value }, router, getDetail)
        }
      })
      return
    }
    if (status === 'CLOSED') {
      Swal.fire({
        title: 'Closure notes',
        input: 'textarea',
        inputPlaceholder: 'Describe closure...',
        showCancelButton: true,
        confirmButtonText: 'Close Change',
      }).then((result) => {
        if (result.isConfirmed && result.value) {
          setChangeStatus(id, 'CLOSED', { closureNotes: result.value }, router, getDetail)
        }
      })
      return
    }
    setChangeStatus(id, status, {}, router, getDetail)
  }

  useEffect(() => {
    getDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!change) {
    return (
      <div className={styles.page}>
        <span className={styles.backLink} onClick={() => router.push('/change')}>
          &larr; Back to Changes
        </span>
        <div className={styles.detailCard}>
          <div className={styles.emptyState}>Loading change...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <span className={styles.backLink} onClick={() => router.push('/change')}>
        &larr; Back to Changes
      </span>

      <div className={styles.detailLayout}>
        <div>
          <div className={styles.detailCard}>
            <div className={styles.detailMeta}>
              <span className={styles[statusClass[change.status] || 'statusNeutral']}>{change.status}</span>
              <span className={styles.typeBadge}>{change.type}</span>
              <span className={styles[priorityClass[change.priority] || 'priorityP3']}>P{change.priority}</span>
              <span className={styles.typeBadge}>Risk: {change.riskLevel}</span>
            </div>
            <h1 className={styles.detailTitle}>
              {change.changeId}: {change.title}
            </h1>

            <div className={styles.detailSection}>
              <p className={styles.detailSectionLabel}>Description</p>
              <div className={styles.detailSectionBody}>{change.description}</div>
            </div>
            {change.impactAnalysis && (
              <div className={styles.detailSection}>
                <p className={styles.detailSectionLabel}>Impact Analysis</p>
                <div className={styles.detailSectionBody}>{change.impactAnalysis}</div>
              </div>
            )}
            <div className={styles.detailSection}>
              <p className={styles.detailSectionLabel}>Implementation Plan</p>
              <div className={styles.detailSectionBody}>{change.implementationPlan || '—'}</div>
            </div>
            <div className={styles.detailSection}>
              <p className={styles.detailSectionLabel}>Backout Plan</p>
              <div className={styles.detailSectionBody}>{change.backoutPlan || '—'}</div>
            </div>
            <div className={styles.detailSection}>
              <p className={styles.detailSectionLabel}>Test Plan</p>
              <div className={styles.detailSectionBody}>{change.testPlan || '—'}</div>
            </div>
            {change.reviewNotes && (
              <div className={styles.detailSection}>
                <p className={styles.detailSectionLabel}>Review Notes</p>
                <div className={styles.detailSectionBody}>{change.reviewNotes}</div>
              </div>
            )}
            {change.closureNotes && (
              <div className={styles.detailSection}>
                <p className={styles.detailSectionLabel}>Closure Notes</p>
                <div className={styles.detailSectionBody}>{change.closureNotes}</div>
              </div>
            )}

            {change.approvals?.length > 0 && (
              <div className={styles.detailSection}>
                <p className={styles.detailSectionLabel}>CAB Approval History</p>
                <div className={styles.timeline}>
                  {change.approvals.map((a, idx) => (
                    <div key={idx} className={styles.timelineItem}>
                      <div className={styles.timelineHead}>
                        <span>{a.approverEmail}</span>
                        <span className={styles[a.decision === 'APPROVED' ? 'statusSuccess' : 'statusDanger']}>
                          {a.decision}
                        </span>
                      </div>
                      <div className={styles.timelineMeta}>{new Date(a.decidedDate).toLocaleString()}</div>
                      {a.comment && <div className={styles.timelineComment}>{a.comment}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          {canManage && ['DRAFT', 'REJECTED'].includes(change.status) && (
            <div className={styles.sidePanel} style={{ marginBottom: 16 }}>
              <p className={styles.sidePanelTitle}>Actions</p>
              <div className={styles.actionBtnRow}>
                <button type="button" className={styles.actionBtn} onClick={submitForApproval}>
                  Submit for CAB Approval
                </button>
                <button type="button" className={styles.actionBtnDanger} onClick={() => transition('CANCELLED')}>
                  Cancel Change
                </button>
              </div>
            </div>
          )}

          {canApprove && change.status === 'PENDING_APPROVAL' && (
            <div className={styles.sidePanel} style={{ marginBottom: 16 }}>
              <p className={styles.sidePanelTitle}>CAB Decision</p>
              <div className={styles.actionBtnRow}>
                <button type="button" className={styles.actionBtn} onClick={() => decide('APPROVED')}>
                  Approve
                </button>
                <button type="button" className={styles.actionBtnDanger} onClick={() => decide('REJECTED')}>
                  Reject
                </button>
              </div>
            </div>
          )}

          {canManage && change.status === 'APPROVED' && (
            <div className={styles.sidePanel} style={{ marginBottom: 16 }}>
              <p className={styles.sidePanelTitle}>Schedule</p>
              {scheduling || !change.scheduledStart ? (
                <>
                  <div className={styles.formField} style={{ marginBottom: 8 }}>
                    <label className={styles.formLabel}>Start</label>
                    <input
                      type="datetime-local"
                      className={styles.formInput}
                      value={schedule.scheduledStart}
                      onChange={(e) => setSchedule({ ...schedule, scheduledStart: e.target.value })}
                    />
                  </div>
                  <div className={styles.formField} style={{ marginBottom: 8 }}>
                    <label className={styles.formLabel}>End</label>
                    <input
                      type="datetime-local"
                      className={styles.formInput}
                      value={schedule.scheduledEnd}
                      onChange={(e) => setSchedule({ ...schedule, scheduledEnd: e.target.value })}
                    />
                  </div>
                  <button type="button" className={styles.actionBtn} onClick={saveSchedule}>
                    Save Schedule
                  </button>
                </>
              ) : (
                <>
                  <p className={styles.email}>
                    {new Date(change.scheduledStart).toLocaleString()} &rarr;{' '}
                    {change.scheduledEnd ? new Date(change.scheduledEnd).toLocaleString() : '—'}
                  </p>
                  <div className={styles.actionBtnRow} style={{ marginTop: 12 }}>
                    <button type="button" className={styles.actionBtn} onClick={() => transition('SCHEDULED')}>
                      Confirm Scheduled
                    </button>
                    <button type="button" className={styles.actionBtnSecondary} onClick={() => setScheduling(true)}>
                      Change Schedule
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {canManage && change.status === 'SCHEDULED' && (
            <div className={styles.sidePanel} style={{ marginBottom: 16 }}>
              <p className={styles.sidePanelTitle}>Actions</p>
              <div className={styles.actionBtnRow}>
                <button type="button" className={styles.actionBtn} onClick={() => transition('IN_PROGRESS')}>
                  Start Implementation
                </button>
              </div>
            </div>
          )}

          {canManage && change.status === 'IN_PROGRESS' && (
            <div className={styles.sidePanel} style={{ marginBottom: 16 }}>
              <p className={styles.sidePanelTitle}>Actions</p>
              <div className={styles.actionBtnRow}>
                <button type="button" className={styles.actionBtn} onClick={() => transition('IMPLEMENTED')}>
                  Mark Implemented
                </button>
              </div>
            </div>
          )}

          {canManage && change.status === 'IMPLEMENTED' && (
            <div className={styles.sidePanel} style={{ marginBottom: 16 }}>
              <p className={styles.sidePanelTitle}>Actions</p>
              <div className={styles.actionBtnRow}>
                <button type="button" className={styles.actionBtn} onClick={() => transition('REVIEWED')}>
                  Post-Implementation Review
                </button>
              </div>
            </div>
          )}

          {canManage && change.status === 'REVIEWED' && (
            <div className={styles.sidePanel} style={{ marginBottom: 16 }}>
              <p className={styles.sidePanelTitle}>Actions</p>
              <div className={styles.actionBtnRow}>
                <button type="button" className={styles.actionBtn} onClick={() => transition('CLOSED')}>
                  Close Change
                </button>
              </div>
            </div>
          )}

          <div className={styles.sidePanel} style={{ marginBottom: 16 }}>
            <p className={styles.sidePanelTitle}>Linked Incidents ({change.linkedIncidents?.length || 0})</p>
            <div className={styles.chipList}>
              {(change.linkedIncidents || []).map((inc) => (
                <div key={inc.id} className={styles.chip} onClick={() => router.push(`/edit-incident/view/${inc.id}`)}>
                  <span className={styles.chipTitle}>{inc.incidentId}</span>
                  <span className={styles.email}>{inc.status}</span>
                </div>
              ))}
              {(!change.linkedIncidents || change.linkedIncidents.length === 0) && (
                <span className={styles.email}>None linked</span>
              )}
            </div>
          </div>

          <div className={styles.sidePanel}>
            <p className={styles.sidePanelTitle}>Linked Problems ({change.linkedProblems?.length || 0})</p>
            <div className={styles.chipList}>
              {(change.linkedProblems || []).map((p) => (
                <div key={p.id} className={styles.chip} onClick={() => router.push(`/problem/${p.id}`)}>
                  <span className={styles.chipTitle}>{p.problemId}</span>
                  <span className={styles.email}>{p.status}</span>
                </div>
              ))}
              {(!change.linkedProblems || change.linkedProblems.length === 0) && (
                <span className={styles.email}>None linked</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChangeDetail
