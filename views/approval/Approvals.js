import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Swal from 'sweetalert2'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { decideApproval, cancelApproval } from '@/api/approval_api'
import styles from '../itil/itil.module.scss'

const statusClass = { PENDING: 'statusWarning', APPROVED: 'statusSuccess', REJECTED: 'statusDanger', CANCELLED: 'statusNeutral' }

const Approvals = () => {
  const router = useRouter()
  const details = getUserDetails()
  const [pending, setPending] = useState([])
  const [mine, setMine] = useState([])
  const [tab, setTab] = useState('pending')

  const getPendingForMe = async () => {
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    try {
      const response = await fetch(apiUrl + '/auth/service/approval/get-pending-for-me', {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      })
      if (response.status === 401) {
        router.push('/')
        return
      }
      const data = await response.json()
      setPending(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching pending approvals:', error)
    }
  }

  const getMyRequests = async () => {
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    try {
      const response = await fetch(apiUrl + '/auth/service/approval/get-all-page?page=0&size=50', {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      })
      if (response.status === 401) {
        router.push('/')
        return
      }
      const data = await response.json()
      const own = (data.content || []).filter((r) => r.requestedByEmail === details?.email)
      setMine(own)
    } catch (error) {
      console.error('Error fetching my approval requests:', error)
    }
  }

  const decide = (req, decision) => {
    Swal.fire({
      title: decision === 'APPROVED' ? 'Approve this request?' : 'Reject this request?',
      input: 'textarea',
      inputPlaceholder: 'Comment (optional)',
      showCancelButton: true,
      confirmButtonText: decision === 'APPROVED' ? 'Approve' : 'Reject',
    }).then((result) => {
      if (result.isConfirmed) {
        decideApproval(req.id, decision, result.value || '', router, () => {
          getPendingForMe()
        })
      }
    })
  }

  const cancel = (req) => {
    cancelApproval(req.id, router, () => getMyRequests())
  }

  useEffect(() => {
    getPendingForMe()
    getMyRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rows = tab === 'pending' ? pending : mine

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Approvals</h1>
          <p className={styles.pageSubtitle}>Requests awaiting your decision, and requests you&apos;ve raised</p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.filterBar}>
          <button
            type="button"
            className={tab === 'pending' ? styles.applyBtn : styles.filterClear}
            onClick={() => setTab('pending')}
          >
            Pending My Approval ({pending.length})
          </button>
          <button
            type="button"
            className={tab === 'mine' ? styles.applyBtn : styles.filterClear}
            onClick={() => setTab('mine')}
          >
            My Requests
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Approval</th>
                <th>Entity</th>
                <th>Mode</th>
                <th>Status</th>
                <th>Requested By</th>
                {tab === 'pending' && <th>Action</th>}
                {tab === 'mine' && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={styles.email}>{r.approvalId}</td>
                  <td>
                    {r.entityType}
                    {r.entityLabel ? `: ${r.entityLabel}` : ''}
                  </td>
                  <td>
                    <span className={styles.typeBadge}>{r.mode}</span>
                  </td>
                  <td>
                    <span className={styles[statusClass[r.status] || 'statusNeutral']}>{r.status}</span>
                  </td>
                  <td className={styles.email}>{r.requestedByEmail}</td>
                  {tab === 'pending' && (
                    <td>
                      <button type="button" className={styles.editBtn} onClick={() => decide(r, 'APPROVED')}>
                        Approve
                      </button>
                      <button type="button" className={styles.editBtn} onClick={() => decide(r, 'REJECTED')}>
                        Reject
                      </button>
                    </td>
                  )}
                  {tab === 'mine' && (
                    <td>
                      {r.status === 'PENDING' && (
                        <button type="button" className={styles.editBtn} onClick={() => cancel(r)}>
                          Cancel
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <div className={styles.emptyState}>Nothing here</div>}
        </div>
      </div>
    </div>
  )
}

export default Approvals
