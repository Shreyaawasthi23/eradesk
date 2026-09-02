import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { createMonitoringIntegration } from '@/api/monitoring_api'
import MonitoringModal from './MonitoringModal'
import styles from '../itil/itil.module.scss'

const Monitoring = () => {
  const router = useRouter()
  const details = getUserDetails()
  const [integrations, setIntegrations] = useState({})
  const [showCreate, setShowCreate] = useState(false)

  const getAll = async () => {
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    try {
      const response = await fetch(apiUrl + '/auth/ops/monitoring/get-all-page?page=0&size=50', {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      })
      if (response.status === 401) {
        router.push('/')
        return
      }
      setIntegrations(await response.json())
    } catch (error) {
      console.error('Error fetching monitoring integrations:', error)
    }
  }

  const handleCreate = (values, onCreated) => {
    createMonitoringIntegration(values, router, (data) => {
      getAll()
      onCreated(data)
    })
  }

  useEffect(() => {
    getAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Monitoring Integrations</h1>
          <p className={styles.pageSubtitle}>External systems that can auto-create incidents via webhook</p>
        </div>
        <button type="button" className={styles.addBtn} onClick={() => setShowCreate(true)}>
          + New Integration
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Integration</th>
                <th>Name</th>
                <th>Default Group</th>
                <th>Default Priority</th>
                <th>Events Received</th>
                <th>Last Event</th>
              </tr>
            </thead>
            <tbody>
              {integrations.content?.map((m) => (
                <tr key={m.id}>
                  <td className={styles.email}>{m.integrationId}</td>
                  <td>{m.name}</td>
                  <td className={styles.email}>{m.defaultWorkGroup || '—'}</td>
                  <td className={styles.email}>P{m.defaultPriority}</td>
                  <td className={styles.email}>{m.eventCount}</td>
                  <td className={styles.email}>{m.lastEventDate ? new Date(m.lastEventDate).toLocaleString() : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {integrations.content?.length === 0 && <div className={styles.emptyState}>No monitoring integrations configured</div>}
        </div>
      </div>

      {showCreate && <MonitoringModal onClose={() => setShowCreate(false)} onSubmit={handleCreate} />}
    </div>
  )
}

export default Monitoring
