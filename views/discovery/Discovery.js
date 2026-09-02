import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { createDiscoveryJob, editDiscoveryJob, promoteDeviceToCI, ignoreDevice } from '@/api/discovery_api'
import Pagination from '@/components/ui/Pagination'
import DiscoveryJobModal from './DiscoveryJobModal'
import styles from '../itil/itil.module.scss'

const statusClass = { ACTIVE: 'statusSuccess', PAUSED: 'statusNeutral' }
const deviceStatusClass = { NEW: 'statusWarning', PROMOTED: 'statusSuccess', IGNORED: 'statusNeutral' }

const Discovery = () => {
  const router = useRouter()
  const details = getUserDetails()
  const [jobs, setJobs] = useState({})
  const [selectedJob, setSelectedJob] = useState(null)
  const [devices, setDevices] = useState({})
  const [devicePage, setDevicePage] = useState(0)
  const [showCreate, setShowCreate] = useState(false)

  const canManage =
    details?.roles?.includes('ROLE_ADMIN') ||
    details?.roles?.includes('ROLE_USER') ||
    details?.roles?.includes('ROLE_MODERATOR')

  const getJobs = async () => {
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    try {
      const response = await fetch(apiUrl + '/auth/itil/discovery/job-get-all-page?page=0&size=50', {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      })
      if (response.status === 401) {
        router.push('/')
        return
      }
      const data = await response.json()
      setJobs(data)
    } catch (error) {
      console.error('Error fetching discovery jobs:', error)
    }
  }

  const getDevices = async (jobId, page) => {
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    try {
      const response = await fetch(
        apiUrl + '/auth/itil/discovery/devices-get-all-page?jobId=' + jobId + '&page=' + page + '&size=10',
        { method: 'GET', headers: myHeaders, redirect: 'follow' },
      )
      if (response.status === 401) {
        router.push('/')
        return
      }
      const data = await response.json()
      setDevices(data)
    } catch (error) {
      console.error('Error fetching discovered devices:', error)
    }
  }

  const selectJob = (job) => {
    setSelectedJob(job)
    setDevicePage(0)
    getDevices(job.id, 0)
  }

  const handleCreate = (values, onCreated) => {
    createDiscoveryJob(values, router, (data) => {
      getJobs()
      onCreated(data)
    })
  }

  const togglePause = (job) => {
    editDiscoveryJob({ id: job.id, status: job.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }, router, () => {
      getJobs()
      if (selectedJob?.id === job.id) selectJob({ ...job, status: job.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' })
    })
  }

  const handlePromote = (device) => {
    promoteDeviceToCI(device.id, router, () => getDevices(selectedJob.id, devicePage))
  }

  const handleIgnore = (device) => {
    ignoreDevice(device.id, router, () => getDevices(selectedJob.id, devicePage))
  }

  useEffect(() => {
    getJobs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Asset Discovery</h1>
          <p className={styles.pageSubtitle}>
            Discovery jobs and devices reported by on-prem scanning agents
          </p>
        </div>
        {canManage && (
          <button type="button" className={styles.addBtn} onClick={() => setShowCreate(true)}>
            + New Discovery Job
          </button>
        )}
      </div>

      <div className={styles.detailLayout}>
        <div>
          <div className={styles.card}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>CIDR</th>
                    <th>Schedule</th>
                    <th>Status</th>
                    <th>Devices</th>
                    <th>Last Run</th>
                    {canManage && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {jobs.content?.map((j) => (
                    <tr key={j.id}>
                      <td className={styles.idCell} onClick={() => selectJob(j)}>
                        {j.jobId} — {j.name}
                      </td>
                      <td className={styles.email}>{j.cidr}</td>
                      <td className={styles.email}>{j.schedule}</td>
                      <td>
                        <span className={styles[statusClass[j.status] || 'statusNeutral']}>{j.status}</span>
                      </td>
                      <td className={styles.email}>{j.deviceCount}</td>
                      <td className={styles.email}>
                        {j.lastRunDate ? new Date(j.lastRunDate).toLocaleString() : 'Never'}
                      </td>
                      {canManage && (
                        <td>
                          <button type="button" className={styles.editBtn} onClick={() => togglePause(j)}>
                            {j.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {jobs.content?.length === 0 && <div className={styles.emptyState}>No discovery jobs yet</div>}
            </div>
          </div>
        </div>

        <div>
          <div className={styles.sidePanel}>
            <p className={styles.sidePanelTitle}>
              {selectedJob ? `Devices — ${selectedJob.name}` : 'Select a job to review devices'}
            </p>
            {selectedJob && (
              <>
                <div className={styles.chipList}>
                  {devices.content?.map((d) => (
                    <div key={d.id} className={styles.chip} style={{ cursor: 'default' }}>
                      <span className={styles.chipTitle}>
                        {d.hostname || d.ip} ({d.ip})
                      </span>
                      <span className={styles[deviceStatusClass[d.status] || 'statusNeutral']}>{d.status}</span>
                    </div>
                  ))}
                  {(!devices.content || devices.content.length === 0) && (
                    <span className={styles.email}>No devices reported yet</span>
                  )}
                </div>
                {canManage && devices.content?.some((d) => d.status === 'NEW') && (
                  <div style={{ marginTop: 12 }}>
                    {devices.content
                      .filter((d) => d.status === 'NEW')
                      .map((d) => (
                        <div key={d.id} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                          <span className={styles.email} style={{ flex: 1 }}>
                            {d.hostname || d.ip}
                          </span>
                          <button type="button" className={styles.editBtn} onClick={() => handlePromote(d)}>
                            Promote to CI
                          </button>
                          <button type="button" className={styles.editBtn} onClick={() => handleIgnore(d)}>
                            Ignore
                          </button>
                        </div>
                      ))}
                  </div>
                )}
                <Pagination
                  currentPage={devicePage}
                  totalPages={devices.totalPages}
                  onPageChange={(p) => {
                    setDevicePage(p)
                    getDevices(selectedJob.id, p)
                  }}
                  variant="styled"
                  styles={styles}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {showCreate && <DiscoveryJobModal onClose={() => setShowCreate(false)} onSubmit={handleCreate} />}
    </div>
  )
}

export default Discovery
