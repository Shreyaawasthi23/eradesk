import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { createSoftware } from '@/api/software_api'
import Pagination from '@/components/ui/Pagination'
import SoftwareModal from './SoftwareModal'
import styles from '../itil/itil.module.scss'

const Software = () => {
  const router = useRouter()
  const details = getUserDetails()
  const [software, setSoftware] = useState({})
  const [currentPage, setCurrentPage] = useState(0)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const canManage =
    details?.roles?.includes('ROLE_ADMIN') ||
    details?.roles?.includes('ROLE_USER') ||
    details?.roles?.includes('ROLE_MODERATOR')

  const getAll = async (page, size) => {
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    try {
      const response = await fetch(apiUrl + '/auth/software/get-all-page?page=' + page + '&size=' + size, {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      })
      if (response.status === 401) {
        router.push('/')
        return
      }
      const data = await response.json()
      setSoftware(data)
    } catch (error) {
      console.error('Error fetching software:', error)
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
        apiUrl + '/auth/software/search?q=' + encodeURIComponent(search) + '&page=0&size=50',
        { method: 'GET', headers: myHeaders, redirect: 'follow' },
      )
      if (response.status === 401) {
        router.push('/')
        return
      }
      const data = await response.json()
      setSoftware(data)
      setCurrentPage(0)
    } catch (error) {
      console.error('Error searching software:', error)
    }
  }

  const gotToPage = (pageNo) => {
    getAll(pageNo, 10)
    setCurrentPage(pageNo)
  }

  const viewSoftware = (id) => router.push(`/software/${id}`)

  const handleCreate = (values) => {
    createSoftware(values, router, () => {
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
          <h1 className={styles.pageTitle}>Software Asset Management</h1>
          <p className={styles.pageSubtitle}>Licenses, installations, and compliance</p>
        </div>
        {canManage && (
          <button type="button" className={styles.addBtn} onClick={() => setShowCreate(true)}>
            + New Software
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
              placeholder="Name, publisher, SW ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            />
          </div>
          <button type="button" className={styles.applyBtn} onClick={runSearch}>
            Search
          </button>
          <button
            type="button"
            className={styles.filterClear}
            onClick={() => {
              setSearch('')
              setCurrentPage(0)
              getAll(0, 10)
            }}
          >
            Clear
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Software</th>
                <th>Name</th>
                <th>Publisher</th>
                <th>Category</th>
              </tr>
            </thead>
            <tbody>
              {software.content?.map((s) => (
                <tr key={s.id}>
                  <td className={styles.idCell} onClick={() => viewSoftware(s.id)}>
                    {s.softwareId}
                  </td>
                  <td>{s.name}</td>
                  <td className={styles.email}>{s.publisher || '—'}</td>
                  <td>
                    <span className={styles.typeBadge}>{s.category}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {software.content?.length === 0 && <div className={styles.emptyState}>No software tracked yet</div>}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={software.totalPages}
          onPageChange={gotToPage}
          variant="styled"
          styles={styles}
        />
      </div>

      {showCreate && <SoftwareModal onClose={() => setShowCreate(false)} onSubmit={handleCreate} />}
    </div>
  )
}

export default Software
