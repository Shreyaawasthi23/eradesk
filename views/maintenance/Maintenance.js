import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { createMaintenanceWindow, setMaintenanceStatus } from '@/api/maintenance_api'
import MaintenanceModal from './MaintenanceModal'
import styles from '../itil/itil.module.scss'

const statusClass = { SCHEDULED: 'statusInfo', IN_PROGRESS: 'statusWarning', COMPLETED: 'statusSuccess', CANCELLED: 'statusDanger' }

const Maintenance = () => {
  const router = useRouter()
  const details = getUserDetails()
  const [windows, setWindows] = useState({})
  const [showCreate, setShowCreate] = useState(false)

  const canManage = details?.roles?.includes('ROLE_ADMIN') || details?.roles?.includes('ROLE_MODERATOR')

  const getAll = async () => {
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    try {
      const response = await fetch(apiUrl + '/auth/ops/maintenance/get-all-page?page=0&size=50', {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      })
      if (response.status === 401) {
        router.push('/')
        return
      }
      const data = await response.json()
      setWindows(data)
    } catch (error) {
      console.error('Error fetching maintenance windows:', error)
    }
  }

  const handleCreate = (values) => {
    createMaintenanceWindow(values, router, () => {
      setShowCreate(false)
      getAll()
    })
  }

  const transition = (id, status) => setMaintenanceStatus(id, status, router, getAll)

  useEffect(() => {
    getAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Maintenance Windows</h1>
          <p className={styles.pageSubtitle}>Scheduled maintenance auto-creates an announcement</p>
        </div>
        {canManage && (
          <button type="button" className={styles.addBtn} onClick={() => setShowCreate(true)}>
            + New Maintenance Window
          </button>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Window</th>
                <th>Name</th>
                <th>Services</th>
                <th>Sites</th>
                <th>Status</th>
                <th>Start</th>
                <th>End</th>
                {canManage && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {windows.content?.map((w) => (
                <tr key={w.id}>
                  <td className={styles.email}>{w.windowId}</td>
                  <td>{w.name}</td>
                  <td className={styles.email}>{w.servicesAffected.join(', ') || '—'}</td>
                  <td className={styles.email}>{w.sitesAffected.join(', ') || '—'}</td>
                  <td>
                    <span className={styles[statusClass[w.status] || 'statusNeutral']}>{w.status}</span>
                  </td>
                  <td className={styles.email}>{new Date(w.startDate).toLocaleString()}</td>
                  <td className={styles.email}>{new Date(w.endDate).toLocaleString()}</td>
                  {canManage && (
                    <td>
                      {w.status === 'SCHEDULED' && (
                        <>
                          <button type="button" className={styles.editBtn} onClick={() => transition(w.id, 'IN_PROGRESS')}>
                            Start
                          </button>
                          <button type="button" className={styles.editBtn} onClick={() => transition(w.id, 'CANCELLED')}>
                            Cancel
                          </button>
                        </>
                      )}
                      {w.status === 'IN_PROGRESS' && (
                        <button type="button" className={styles.editBtn} onClick={() => transition(w.id, 'COMPLETED')}>
                          Complete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {windows.content?.length === 0 && <div className={styles.emptyState}>No maintenance windows scheduled</div>}
        </div>
      </div>

      {showCreate && <MaintenanceModal onClose={() => setShowCreate(false)} onSubmit={handleCreate} />}
    </div>
  )
}

export default Maintenance
