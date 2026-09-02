import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Swal from 'sweetalert2'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { editRelease, linkToRelease, setReleaseStatus } from '@/api/release_api'
import styles from '../itil/itil.module.scss'

const statusClass = {
  PLANNING: 'statusNeutral',
  TESTING: 'statusInfo',
  APPROVED: 'statusInfo',
  DEPLOYED: 'statusSuccess',
  ROLLED_BACK: 'statusDanger',
  REVIEWED: 'statusSuccess',
  CLOSED: 'statusSuccess',
  CANCELLED: 'statusDanger',
}

const LINK_TYPES = [
  { key: 'change', label: 'Link Change', listKey: 'linkedChanges', idField: 'changeId', route: '/change' },
  { key: 'problem', label: 'Link Problem', listKey: 'linkedProblems', idField: 'problemId', route: '/problem' },
  { key: 'incident', label: 'Link Incident', listKey: 'linkedIncidents', idField: 'incidentId', route: '/edit-incident/view' },
]

const ReleaseDetail = () => {
  const router = useRouter()
  const { id } = router.query
  const details = getUserDetails()
  const [release, setRelease] = useState(null)

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
      const response = await fetch(apiUrl + '/auth/release/get-detail?id=' + id, {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      })
      if (response.status === 401) {
        router.push('/')
        return
      }
      if (response.status === 404) {
        setRelease(null)
        return
      }
      const data = await response.json()
      setRelease(data)
    } catch (error) {
      console.error('Error fetching release:', error)
    }
  }

  const transition = (status, requiresPrompt) => {
    if (requiresPrompt) {
      Swal.fire({
        title: requiresPrompt.title,
        input: 'textarea',
        inputPlaceholder: requiresPrompt.placeholder,
        showCancelButton: true,
        confirmButtonText: requiresPrompt.confirmText,
      }).then((result) => {
        if (result.isConfirmed && result.value) {
          setReleaseStatus(id, status, { [requiresPrompt.field]: result.value }, router, getDetail)
        }
      })
      return
    }
    setReleaseStatus(id, status, {}, router, getDetail)
  }

  const handleDeploy = () => {
    if (!release.rollbackPlan) {
      Swal.fire({
        title: 'Rollback plan required',
        input: 'textarea',
        inputPlaceholder: 'Describe how to roll back this release if needed...',
        showCancelButton: true,
        confirmButtonText: 'Save & Deploy',
      }).then((result) => {
        if (result.isConfirmed && result.value) {
          editRelease({ id, rollbackPlan: result.value }, router, () => {
            setReleaseStatus(id, 'DEPLOYED', {}, router, getDetail)
          })
        }
      })
      return
    }
    setReleaseStatus(id, 'DEPLOYED', {}, router, getDetail)
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
        linkToRelease(id, entityType, result.value.trim(), router, getDetail)
      }
    })
  }

  useEffect(() => {
    getDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!release) {
    return (
      <div className={styles.page}>
        <span className={styles.backLink} onClick={() => router.push('/release')}>
          &larr; Back to Releases
        </span>
        <div className={styles.detailCard}>
          <div className={styles.emptyState}>Loading release...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <span className={styles.backLink} onClick={() => router.push('/release')}>
        &larr; Back to Releases
      </span>

      <div className={styles.detailLayout}>
        <div>
          <div className={styles.detailCard}>
            <div className={styles.detailMeta}>
              <span className={styles[statusClass[release.status] || 'statusNeutral']}>{release.status}</span>
              <span className={styles.typeBadge}>{release.type}</span>
              {release.version && <span className={styles.typeBadge}>v{release.version}</span>}
            </div>
            <h1 className={styles.detailTitle}>
              {release.releaseId}: {release.title}
            </h1>

            <div className={styles.detailSection}>
              <p className={styles.detailSectionLabel}>Description</p>
              <div className={styles.detailSectionBody}>{release.description}</div>
            </div>
            <div className={styles.detailSection}>
              <p className={styles.detailSectionLabel}>Test Notes</p>
              <div className={styles.detailSectionBody}>{release.testNotes || '—'}</div>
            </div>
            <div className={styles.detailSection}>
              <p className={styles.detailSectionLabel}>Rollback Plan</p>
              <div className={styles.detailSectionBody}>{release.rollbackPlan || '—'}</div>
            </div>
            {release.postReleaseReview && (
              <div className={styles.detailSection}>
                <p className={styles.detailSectionLabel}>Post-Release Review</p>
                <div className={styles.detailSectionBody}>{release.postReleaseReview}</div>
              </div>
            )}
            {release.deployedDate && (
              <div className={styles.detailSection}>
                <p className={styles.detailSectionLabel}>Deployed</p>
                <div className={styles.detailSectionBody}>{new Date(release.deployedDate).toLocaleString()}</div>
              </div>
            )}
          </div>
        </div>

        <div>
          {canManage && release.status === 'PLANNING' && (
            <div className={styles.sidePanel} style={{ marginBottom: 16 }}>
              <p className={styles.sidePanelTitle}>Actions</p>
              <div className={styles.actionBtnRow}>
                <button type="button" className={styles.actionBtn} onClick={() => transition('TESTING')}>
                  Move to Testing
                </button>
                <button type="button" className={styles.actionBtnDanger} onClick={() => transition('CANCELLED')}>
                  Cancel Release
                </button>
              </div>
            </div>
          )}

          {canManage && release.status === 'TESTING' && (
            <div className={styles.sidePanel} style={{ marginBottom: 16 }}>
              <p className={styles.sidePanelTitle}>Actions</p>
              <div className={styles.actionBtnRow}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() =>
                    transition('APPROVED', {
                      title: 'Test notes',
                      placeholder: 'Summarize test results...',
                      confirmText: 'Approve',
                      field: 'testNotes',
                    })
                  }
                >
                  Approve Release
                </button>
                <button type="button" className={styles.actionBtnSecondary} onClick={() => transition('PLANNING')}>
                  Back to Planning
                </button>
                <button type="button" className={styles.actionBtnDanger} onClick={() => transition('CANCELLED')}>
                  Cancel Release
                </button>
              </div>
            </div>
          )}

          {canManage && release.status === 'APPROVED' && (
            <div className={styles.sidePanel} style={{ marginBottom: 16 }}>
              <p className={styles.sidePanelTitle}>Actions</p>
              <div className={styles.actionBtnRow}>
                <button type="button" className={styles.actionBtn} onClick={handleDeploy}>
                  Deploy Release
                </button>
                <button type="button" className={styles.actionBtnDanger} onClick={() => transition('CANCELLED')}>
                  Cancel Release
                </button>
              </div>
            </div>
          )}

          {canManage && release.status === 'DEPLOYED' && (
            <div className={styles.sidePanel} style={{ marginBottom: 16 }}>
              <p className={styles.sidePanelTitle}>Actions</p>
              <div className={styles.actionBtnRow}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() =>
                    transition('REVIEWED', {
                      title: 'Post-release review',
                      placeholder: 'How did the deployment go?',
                      confirmText: 'Mark Reviewed',
                      field: 'postReleaseReview',
                    })
                  }
                >
                  Post-Implementation Review
                </button>
                <button type="button" className={styles.actionBtnDanger} onClick={() => transition('ROLLED_BACK')}>
                  Roll Back
                </button>
              </div>
            </div>
          )}

          {canManage && release.status === 'ROLLED_BACK' && (
            <div className={styles.sidePanel} style={{ marginBottom: 16 }}>
              <p className={styles.sidePanelTitle}>Actions</p>
              <div className={styles.actionBtnRow}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() =>
                    transition('REVIEWED', {
                      title: 'Post-release review',
                      placeholder: 'Why was this rolled back?',
                      confirmText: 'Mark Reviewed',
                      field: 'postReleaseReview',
                    })
                  }
                >
                  Post-Rollback Review
                </button>
              </div>
            </div>
          )}

          {canManage && release.status === 'REVIEWED' && (
            <div className={styles.sidePanel} style={{ marginBottom: 16 }}>
              <p className={styles.sidePanelTitle}>Actions</p>
              <div className={styles.actionBtnRow}>
                <button type="button" className={styles.actionBtn} onClick={() => transition('CLOSED')}>
                  Close Release
                </button>
              </div>
            </div>
          )}

          {LINK_TYPES.map((lt) => (
            <div key={lt.key} className={styles.sidePanel} style={{ marginBottom: 16 }}>
              <p className={styles.sidePanelTitle}>
                {lt.label.replace('Link ', '')}s ({release[lt.listKey]?.length || 0})
              </p>
              <div className={styles.chipList}>
                {(release[lt.listKey] || []).map((entity) => (
                  <div
                    key={entity.id}
                    className={styles.chip}
                    onClick={() => router.push(`${lt.route}/${entity.id}`)}
                  >
                    <span className={styles.chipTitle}>{entity[lt.idField]}</span>
                    <span className={styles.email}>{entity.status}</span>
                  </div>
                ))}
                {(!release[lt.listKey] || release[lt.listKey].length === 0) && (
                  <span className={styles.email}>None linked</span>
                )}
              </div>
              {canManage && (
                <button
                  type="button"
                  className={styles.editBtn}
                  style={{ marginTop: 12 }}
                  onClick={() => addLink(lt.key)}
                >
                  + {lt.label}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ReleaseDetail
