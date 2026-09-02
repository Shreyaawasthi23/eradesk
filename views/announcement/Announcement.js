import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { createAnnouncement } from '@/api/maintenance_api'
import AnnouncementModal from './AnnouncementModal'
import styles from '../itil/itil.module.scss'

const priorityClass = { HIGH: 'priorityP1', NORMAL: 'priorityP3', LOW: 'priorityP4' }

const Announcement = () => {
  const router = useRouter()
  const details = getUserDetails()
  const [announcements, setAnnouncements] = useState({})
  const [showCreate, setShowCreate] = useState(false)

  const canManage = details?.roles?.includes('ROLE_ADMIN') || details?.roles?.includes('ROLE_MODERATOR')

  const getAll = async () => {
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    try {
      const response = await fetch(apiUrl + '/auth/ops/announcement/get-all-page?page=0&size=50', {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      })
      if (response.status === 401) {
        router.push('/')
        return
      }
      const data = await response.json()
      setAnnouncements(data)
    } catch (error) {
      console.error('Error fetching announcements:', error)
    }
  }

  const handleCreate = (values) => {
    createAnnouncement(values, router, () => {
      setShowCreate(false)
      getAll()
    })
  }

  useEffect(() => {
    getAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const now = new Date()

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Announcements</h1>
          <p className={styles.pageSubtitle}>System-wide notices shown on the dashboard</p>
        </div>
        {canManage && (
          <button type="button" className={styles.addBtn} onClick={() => setShowCreate(true)}>
            + New Announcement
          </button>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Announcement</th>
                <th>Title</th>
                <th>Priority</th>
                <th>Audience</th>
                <th>Source</th>
                <th>Window</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {announcements.content?.map((a) => {
                const isLive = new Date(a.startDate) <= now && now <= new Date(a.endDate)
                return (
                  <tr key={a.id}>
                    <td className={styles.email}>{a.announcementId}</td>
                    <td>{a.title}</td>
                    <td>
                      <span className={styles[priorityClass[a.priority] || 'priorityP3']}>{a.priority}</span>
                    </td>
                    <td>
                      <span className={styles.typeBadge}>{a.audience.replace('_', ' ')}</span>
                    </td>
                    <td className={styles.email}>{a.source === 'MAINTENANCE_WINDOW' ? 'Maintenance' : 'Manual'}</td>
                    <td className={styles.email}>
                      {new Date(a.startDate).toLocaleDateString()} - {new Date(a.endDate).toLocaleDateString()}
                    </td>
                    <td>
                      <span className={isLive ? styles.statusSuccess : styles.statusNeutral}>
                        {isLive ? 'Live' : 'Expired'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {announcements.content?.length === 0 && <div className={styles.emptyState}>No announcements yet</div>}
        </div>
      </div>

      {showCreate && <AnnouncementModal onClose={() => setShowCreate(false)} onSubmit={handleCreate} />}
    </div>
  )
}

export default Announcement
