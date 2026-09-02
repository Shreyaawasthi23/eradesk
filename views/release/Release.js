import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { createRelease } from '@/api/release_api'
import Pagination from '@/components/ui/Pagination'
import ReleaseModal from './ReleaseModal'
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

const Release = () => {
  const router = useRouter()
  const details = getUserDetails()
  const [releases, setReleases] = useState({})
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
        '/auth/release/get-all-page?page=' +
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
      if (data !== null) setReleases(data)
    } catch (error) {
      console.error('Error fetching releases:', error)
    }
  }

  const getEngineers = async () => {
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    try {
      const response = await fetch(apiUrl + '/auth/users/get-engineers', {
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
        apiUrl + '/auth/release/search?q=' + encodeURIComponent(search) + '&page=0&size=50',
        { method: 'GET', headers: myHeaders, redirect: 'follow' },
      )
      if (response.status === 401) {
        router.push('/')
        return
      }
      const data = await response.json()
      setReleases(data)
      setCurrentPage(0)
    } catch (error) {
      console.error('Error searching releases:', error)
    }
  }

  const gotToPage = (pageNo) => {
    getAll(pageNo, 10)
    setCurrentPage(pageNo)
  }

  const viewRelease = (id) => router.push(`/release/${id}`)

  const handleCreate = (values) => {
    createRelease(values, router, () => {
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
          <h1 className={styles.pageTitle}>Release Management</h1>
          <p className={styles.pageSubtitle}>Plan, test, and deploy releases</p>
        </div>
        {canManage && (
          <button type="button" className={styles.addBtn} onClick={() => setShowCreate(true)}>
            + New Release
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
              placeholder="Title, description, version, REL ID..."
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
              <option value="PLANNING">Planning</option>
              <option value="TESTING">Testing</option>
              <option value="APPROVED">Approved</option>
              <option value="DEPLOYED">Deployed</option>
              <option value="ROLLED_BACK">Rolled Back</option>
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
              <option value="MAJOR">Major</option>
              <option value="MINOR">Minor</option>
              <option value="PATCH">Patch</option>
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
                <th>Release</th>
                <th>Title</th>
                <th>Version</th>
                <th>Type</th>
                <th>Status</th>
                <th>Deployed</th>
              </tr>
            </thead>
            <tbody>
              {releases.content?.map((r) => (
                <tr key={r.id}>
                  <td className={styles.idCell} onClick={() => viewRelease(r.id)}>
                    {r.releaseId}
                  </td>
                  <td>{r.title}</td>
                  <td className={styles.email}>{r.version || '—'}</td>
                  <td>
                    <span className={styles.typeBadge}>{r.type}</span>
                  </td>
                  <td>
                    <span className={styles[statusClass[r.status] || 'statusNeutral']}>{r.status}</span>
                  </td>
                  <td className={styles.email}>
                    {r.deployedDate ? new Date(r.deployedDate).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {releases.content?.length === 0 && <div className={styles.emptyState}>No releases found</div>}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={releases.totalPages}
          onPageChange={gotToPage}
          variant="styled"
          styles={styles}
        />
      </div>

      {showCreate && (
        <ReleaseModal
          title="New Release"
          submitLabel="Create"
          engineerList={engineerList}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  )
}

export default Release
