import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { createContract } from '@/api/contract_api'
import Pagination from '@/components/ui/Pagination'
import ContractModal from './ContractModal'
import styles from '../itil/itil.module.scss'

const statusClass = { ACTIVE: 'statusSuccess', RENEWED: 'statusInfo', EXPIRED: 'statusDanger', TERMINATED: 'statusNeutral' }

const daysUntil = (date) => Math.ceil((new Date(date) - new Date()) / (24 * 60 * 60 * 1000))

const Contract = () => {
  const router = useRouter()
  const details = getUserDetails()
  const [contracts, setContracts] = useState({})
  const [currentPage, setCurrentPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [vendorList, setVendorList] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [expiringOnly, setExpiringOnly] = useState(false)

  const canManage =
    details?.roles?.includes('ROLE_ADMIN') ||
    details?.roles?.includes('ROLE_USER') ||
    details?.roles?.includes('ROLE_MODERATOR')

  const getAll = async (page, size, status = statusFilter) => {
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    try {
      const url =
        apiUrl + '/auth/contract/get-all-page?page=' + page + '&size=' + size + (status ? '&status=' + status : '')
      const response = await fetch(url, { method: 'GET', headers: myHeaders, redirect: 'follow' })
      if (response.status === 401) {
        router.push('/')
        return
      }
      const data = await response.json()
      setContracts(data)
    } catch (error) {
      console.error('Error fetching contracts:', error)
    }
  }

  const getExpiring = async () => {
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    try {
      const response = await fetch(apiUrl + '/auth/contract/expiring-contracts?days=30', {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      })
      if (response.status === 401) {
        router.push('/')
        return
      }
      const data = await response.json()
      setContracts({ content: data, totalPages: 1, number: 0 })
      setCurrentPage(0)
    } catch (error) {
      console.error('Error fetching expiring contracts:', error)
    }
  }

  const getVendors = async () => {
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    try {
      const response = await fetch(apiUrl + '/auth/vendor/get-all-list', {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      })
      if (response.status === 401) return
      const data = await response.json()
      setVendorList(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching vendors:', error)
    }
  }

  const gotToPage = (pageNo) => {
    getAll(pageNo, 10)
    setCurrentPage(pageNo)
  }

  const viewContract = (id) => router.push(`/contract/${id}`)

  const handleCreate = (values) => {
    createContract(values, router, () => {
      setShowCreate(false)
      getAll(0, 10)
    })
  }

  const toggleExpiring = () => {
    const next = !expiringOnly
    setExpiringOnly(next)
    if (next) getExpiring()
    else getAll(0, 10)
  }

  useEffect(() => {
    getAll(0, 10)
    getVendors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Contracts</h1>
          <p className={styles.pageSubtitle}>AMC, warranty, and service contracts</p>
        </div>
        {canManage && (
          <button type="button" className={styles.addBtn} onClick={() => setShowCreate(true)}>
            + New Contract
          </button>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.filterBar}>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Status</label>
            <select
              className={styles.filterSelect}
              value={statusFilter}
              disabled={expiringOnly}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(0)
                getAll(0, 10, e.target.value)
              }}
            >
              <option value="">All</option>
              <option value="ACTIVE">Active</option>
              <option value="RENEWED">Renewed</option>
              <option value="EXPIRED">Expired</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>
          <button type="button" className={expiringOnly ? styles.applyBtn : styles.filterClear} onClick={toggleExpiring}>
            {expiringOnly ? 'Showing: Expiring in 30 days' : 'Show Expiring Soon'}
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Contract</th>
                <th>Vendor</th>
                <th>Type</th>
                <th>Status</th>
                <th>End Date</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {contracts.content?.map((c) => {
                const remaining = daysUntil(c.endDate)
                const nearExpiry = c.status === 'ACTIVE' && remaining <= 30
                return (
                  <tr key={c.id}>
                    <td className={styles.idCell} onClick={() => viewContract(c.id)}>
                      {c.contractId}
                    </td>
                    <td>{c.vendorName}</td>
                    <td>
                      <span className={styles.typeBadge}>{c.type}</span>
                    </td>
                    <td>
                      <span className={styles[statusClass[c.status] || 'statusNeutral']}>{c.status}</span>
                    </td>
                    <td className={nearExpiry ? styles.statusWarning : styles.email}>
                      {new Date(c.endDate).toLocaleDateString()}
                      {nearExpiry && ` (${remaining}d)`}
                    </td>
                    <td className={styles.email}>{c.cost != null ? `₹${c.cost.toLocaleString()}` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {contracts.content?.length === 0 && <div className={styles.emptyState}>No contracts found</div>}
        </div>

        {!expiringOnly && (
          <Pagination
            currentPage={currentPage}
            totalPages={contracts.totalPages}
            onPageChange={gotToPage}
            variant="styled"
            styles={styles}
          />
        )}
      </div>

      {showCreate && (
        <ContractModal vendorList={vendorList} onClose={() => setShowCreate(false)} onSubmit={handleCreate} />
      )}
    </div>
  )
}

export default Contract
