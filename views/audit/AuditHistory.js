import React, { useEffect, useState } from 'react'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import styles from '../itil/itil.module.scss'

// Drop-in "Audit History" panel for any entity detail page — fetches this record's own
// audit trail. Used first on ProblemDetail; the same two lines (import + <AuditHistory .../>)
// can be added to other detail views (Change, Release, Contract...) as they're updated.
const AuditHistory = ({ entityType, entityId }) => {
  const details = getUserDetails()
  const [logs, setLogs] = useState([])

  useEffect(() => {
    if (!entityId) return
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    fetch(
      apiUrl + '/auth/ops/audit/get-for-entity?entityType=' + entityType + '&entityId=' + entityId,
      { method: 'GET', headers: myHeaders, redirect: 'follow' },
    )
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setLogs(Array.isArray(data) ? data : []))
      .catch(() => setLogs([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId])

  if (!logs.length) return null

  return (
    <div className={styles.sidePanel} style={{ marginTop: 16 }}>
      <p className={styles.sidePanelTitle}>Audit History</p>
      <div className={styles.timeline}>
        {logs.map((l) => (
          <div key={l.id} className={styles.timelineItem}>
            <div className={styles.timelineHead}>
              <span>{l.userEmail}</span>
              <span className={styles.email}>{new Date(l.timestamp).toLocaleString()}</span>
            </div>
            <div className={styles.timelineMeta}>{l.action}</div>
            {(l.changes || []).map((c, idx) => (
              <div key={idx} className={styles.timelineComment}>
                {c.field}: {String(c.oldValue)} &rarr; {String(c.newValue)}
              </div>
            ))}
            {l.reason && <div className={styles.timelineComment}>&ldquo;{l.reason}&rdquo;</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default AuditHistory
