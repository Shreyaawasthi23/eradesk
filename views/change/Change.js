import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { createChange } from '@/apiClients/change_api'
import Pagination from '@/components/ui/Pagination'
import ChangeModal from './ChangeModal'
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

const Change = () => {
  const router = useRouter()
  const details = getUserDetails()
  const [changes, setChanges] = useState({})
  const [currentPage, setCurrentPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [engineerList, setEngineerList] = useState([])
  const [showCreate, setShowCreate] = useState(false)

  const canManage =
    details?.roles?.includes('ROLE_ADMIN') ||
    details?.roles?.includes('ROLE_USER') ||
    details?.roles?.includes('ROLE_MODERATOR')

  const getAll = async (page, size, status = statusFilter, type = typeFilter) => {
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    try {
      const url =
        apiUrl +
        '/auth/itil/change/get-all-page?page=' +
        page +
        '&size=' +
        size +
        (status ? '&status=' + status : '') +
        (type ? '&type=' + type : '')
      const response = await fetch(url, { method: 'GET', headers: myHeaders, redirect: 'follow' })
      if (response.status === 401) {
        router.push('/')
        return
      }
      const data = await response.json()
      if (data !== null) setChanges(data)
    } catch (error) {
      console.error('Error fetching changes:', error)
    }
  }

  const getEngineers = async () => {
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    try {
      const response = await fetch(apiUrl + '/auth/core/users/get-engineers', {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      })
      if (response.status === 401) return
      const data = await response.json()
      setEngineerList(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching engineers:', error)
    }
  }

  const runSearch = async () => {
    if (!search.trim()) {
      setCurrentPage(0)
      getAll(0, 10)
      return
    }
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    try {
      const response = await fetch(
        apiUrl + '/auth/itil/change/search?q=' + encodeURIComponent(search) + '&page=0&size=50',
        { method: 'GET', headers: myHeaders, redirect: 'follow' },
      )
      if (response.status === 401) {
        router.push('/')
        return
      }
      const data = await response.json()
      setChanges(data)
      setCurrentPage(0)
    } catch (error) {
      console.error('Error searching changes:', error)
    }
  }

  const gotToPage = (pageNo) => {
    getAll(pageNo, 10)
    setCurrentPage(pageNo)
  }

  const viewChange = (id) => router.push(`/change/${id}`)

  const handleCreate = (values) => {
    createChange(values, router, () => {
      setShowCreate(false)
      getAll(0, 10)
    })
  }

  useEffect(() => {
    getAll(0, 10)
    getEngineers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Change Management</h1>
          <p className={styles.pageSubtitle}>CAB-approved changes and deployments</p>
        </div>
        {canManage && (
          <button type="button" className={styles.addBtn} onClick={() => setShowCreate(true)}>
            + New Change
          </button>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.filterBar}>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Search</label>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="Title, description, CHG ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            />
          </div>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Status</label>
            <select
              className={styles.filterSelect}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(0)
                getAll(0, 10, e.target.value, typeFilter)
              }}
            >
              <option value="">All</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IMPLEMENTED">Implemented</option>
              <option value="REVIEWED">Reviewed</option>
              <option value="CLOSED">Closed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Type</label>
            <select
              className={styles.filterSelect}
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value)
                setCurrentPage(0)
                getAll(0, 10, statusFilter, e.target.value)
              }}
            >
              <option value="">All</option>
              <option value="STANDARD">Standard</option>
              <option value="NORMAL">Normal</option>
              <option value="EMERGENCY">Emergency</option>
            </select>
          </div>
          <button type="button" className={styles.applyBtn} onClick={runSearch}>
            Search
          </button>
          <button
            type="button"
            className={styles.filterClear}
            onClick={() => {
              setSearch('')
              setStatusFilter('')
              setTypeFilter('')
              setCurrentPage(0)
              getAll(0, 10, '', '')
            }}
          >
            Clear
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Change</th>
                <th>Title</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Scheduled</th>
              </tr>
            </thead>
            <tbody>
              {changes.content?.map((c) => (
                <tr key={c.id}>
                  <td className={styles.idCell} onClick={() => viewChange(c.id)}>
                    {c.changeId}
                  </td>
                  <td>{c.title}</td>
                  <td>
                    <span className={styles.typeBadge}>{c.type}</span>
                  </td>
                  <td>
                    <span className={styles[priorityClass[c.priority] || 'priorityP3']}>P{c.priority}</span>
                  </td>
                  <td>
                    <span className={styles[statusClass[c.status] || 'statusNeutral']}>{c.status}</span>
                  </td>
                  <td className={styles.email}>
                    {c.scheduledStart ? new Date(c.scheduledStart).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {changes.content?.length === 0 && <div className={styles.emptyState}>No changes found</div>}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={changes.totalPages}
          onPageChange={gotToPage}
          variant="styled"
          styles={styles}
        />
      </div>

      {showCreate && (
        <ChangeModal
          title="New Change Request"
          submitLabel="Create"
          engineerList={engineerList}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  )
}

export default Change
