import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { createCI } from '@/api/cmdb_api'
import Pagination from '@/components/ui/Pagination'
import CIModal from './CIModal'
import styles from '../itil/itil.module.scss'

const statusClass = {
  ACTIVE: 'statusSuccess',
  INACTIVE: 'statusNeutral',
  UNDER_MAINTENANCE: 'statusWarning',
  RETIRED: 'statusDanger',
}

const ConfigurationItems = () => {
  const router = useRouter()
  const details = getUserDetails()
  const [cis, setCis] = useState({})
  const [currentPage, setCurrentPage] = useState(0)
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const canManage =
    details?.roles?.includes('ROLE_ADMIN') ||
    details?.roles?.includes('ROLE_USER') ||
    details?.roles?.includes('ROLE_MODERATOR')

  const getAll = async (page, size, type = typeFilter, status = statusFilter) => {
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    try {
      const url =
        apiUrl +
        '/auth/cmdb/get-all-page?page=' +
        page +
        '&size=' +
        size +
        (type ? '&type=' + type : '') +
        (status ? '&status=' + status : '')
      const response = await fetch(url, { method: 'GET', headers: myHeaders, redirect: 'follow' })
      if (response.status === 401) {
        router.push('/')
        return
      }
      const data = await response.json()
      if (data !== null) setCis(data)
    } catch (error) {
      console.error('Error fetching CIs:', error)
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
        apiUrl + '/auth/cmdb/search?q=' + encodeURIComponent(search) + '&page=0&size=50',
        { method: 'GET', headers: myHeaders, redirect: 'follow' },
      )
      if (response.status === 401) {
        router.push('/')
        return
      }
      const data = await response.json()
      setCis(data)
      setCurrentPage(0)
    } catch (error) {
      console.error('Error searching CIs:', error)
    }
  }

  const gotToPage = (pageNo) => {
    getAll(pageNo, 10)
    setCurrentPage(pageNo)
  }

  const viewCI = (id) => router.push(`/cmdb/${id}`)

  const handleCreate = (values) => {
    createCI(values, router, () => {
      setShowCreate(false)
      getAll(0, 10)
    })
  }

  useEffect(() => {
    getAll(0, 10)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Configuration Items</h1>
          <p className={styles.pageSubtitle}>CMDB: applications, databases, VMs, and infrastructure</p>
        </div>
        {canManage && (
          <button type="button" className={styles.addBtn} onClick={() => setShowCreate(true)}>
            + New CI
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
              placeholder="Name, IP, owner, CI ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            />
          </div>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Type</label>
            <select
              className={styles.filterSelect}
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value)
                setCurrentPage(0)
                getAll(0, 10, e.target.value, statusFilter)
              }}
            >
              <option value="">All</option>
              <option value="SERVER">Server</option>
              <option value="DESKTOP">Desktop</option>
              <option value="LAPTOP">Laptop</option>
              <option value="APPLICATION">Application</option>
              <option value="DATABASE">Database</option>
              <option value="VIRTUAL_MACHINE">Virtual Machine</option>
              <option value="CLOUD_RESOURCE">Cloud Resource</option>
              <option value="NETWORK_DEVICE">Network Device</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Status</label>
            <select
              className={styles.filterSelect}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(0)
                getAll(0, 10, typeFilter, e.target.value)
              }}
            >
              <option value="">All</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="UNDER_MAINTENANCE">Under Maintenance</option>
              <option value="RETIRED">Retired</option>
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
              setTypeFilter('')
              setStatusFilter('')
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
                <th>CI</th>
                <th>Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>IP Address</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {cis.content?.map((ci) => (
                <tr key={ci.id}>
                  <td className={styles.idCell} onClick={() => viewCI(ci.id)}>
                    {ci.ciId}
                  </td>
                  <td>{ci.name}</td>
                  <td>
                    <span className={styles.typeBadge}>{ci.type?.replace('_', ' ')}</span>
                  </td>
                  <td>
                    <span className={styles[statusClass[ci.status] || 'statusNeutral']}>{ci.status}</span>
                  </td>
                  <td className={styles.email}>{ci.ipAddress || '—'}</td>
                  <td className={styles.email}>{ci.owner || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {cis.content?.length === 0 && <div className={styles.emptyState}>No configuration items found</div>}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={cis.totalPages}
          onPageChange={gotToPage}
          variant="styled"
          styles={styles}
        />
      </div>

      {showCreate && (
        <CIModal title="New Configuration Item" submitLabel="Create" onClose={() => setShowCreate(false)} onSubmit={handleCreate} />
      )}
    </div>
  )
}

export default ConfigurationItems
