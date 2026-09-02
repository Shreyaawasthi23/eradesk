import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import Pagination from '@/components/ui/Pagination'
import styles from '../itil/itil.module.scss'

const actionClass = {
  CREATE: 'statusSuccess',
  UPDATE: 'statusInfo',
  DELETE: 'statusDanger',
  STATUS_CHANGE: 'statusWarning',
  CAB_DECISION: 'statusPurple',
  APPROVAL_DECISION: 'statusPurple',
}

const AuditLog = () => {
  const router = useRouter()
  const details = getUserDetails()
  const [logs, setLogs] = useState({})
  const [currentPage, setCurrentPage] = useState(0)
  const [entityType, setEntityType] = useState('')
  const [action, setAction] = useState('')
  const [userEmail, setUserEmail] = useState('')

  const getAll = async (page, size, filters = { entityType, action, userEmail }) => {
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    try {
      const params = new URLSearchParams({ page, size })
      if (filters.entityType) params.set('entityType', filters.entityType)
      if (filters.action) params.set('action', filters.action)
      if (filters.userEmail) params.set('userEmail', filters.userEmail)
      const response = await fetch(apiUrl + '/auth/audit/get-all-page?' + params.toString(), {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      })
      if (response.status === 401) {
        router.push('/')
        return
      }
      if (response.status === 403) {
        setLogs({ content: [], forbidden: true })
        return
      }
      const data = await response.json()
      setLogs(data)
    } catch (error) {
      console.error('Error fetching audit log:', error)
    }
  }

  const gotToPage = (pageNo) => {
    getAll(pageNo, 20)
    setCurrentPage(pageNo)
  }

  const applyFilters = () => {
    setCurrentPage(0)
    getAll(0, 20)
  }

  useEffect(() => {
    getAll(0, 20)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (logs.forbidden) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>Only administrators can view the audit log.</div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Audit Log</h1>
          <p className={styles.pageSubtitle}>Who changed what, across every module</p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.filterBar}>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Entity Type</label>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="e.g. Problem, Change"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Action</label>
            <select className={styles.filterSelect} value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">All</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="STATUS_CHANGE">Status Change</option>
              <option value="CAB_DECISION">CAB Decision</option>
              <option value="APPROVAL_DECISION">Approval Decision</option>
            </select>
          </div>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>User Email</label>
            <input
              type="text"
              className={styles.filterInput}
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <button type="button" className={styles.applyBtn} onClick={applyFilters}>
            Apply
          </button>
          <button
            type="button"
            className={styles.filterClear}
            onClick={() => {
              setEntityType('')
              setAction('')
              setUserEmail('')
              setCurrentPage(0)
              getAll(0, 20, { entityType: '', action: '', userEmail: '' })
            }}
          >
            Clear
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Entity</th>
                <th>User</th>
                <th>Changes</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.content?.map((l) => (
                <tr key={l.id}>
                  <td className={styles.email}>{new Date(l.timestamp).toLocaleString()}</td>
                  <td>
                    <span className={styles[actionClass[l.action] || 'statusNeutral']}>{l.action}</span>
                  </td>
                  <td>
                    {l.entityType}
                    {l.entityLabel ? `: ${l.entityLabel}` : ''}
                  </td>
                  <td className={styles.email}>{l.userEmail}</td>
                  <td className={styles.email}>
                    {(l.changes || []).map((c) => `${c.field}: ${c.oldValue} → ${c.newValue}`).join('; ')}
                  </td>
                  <td className={styles.email}>{l.ipAddress || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.content?.length === 0 && <div className={styles.emptyState}>No audit entries found</div>}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={logs.totalPages}
          onPageChange={gotToPage}
          variant="styled"
          styles={styles}
        />
      </div>
    </div>
  )
}

export default AuditLog
