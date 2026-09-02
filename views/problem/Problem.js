import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { createProblem } from '@/api/problem_api'
import Pagination from '@/components/ui/Pagination'
import ProblemModal from './ProblemModal'
import styles from '../itil/itil.module.scss'

const statusClass = {
  OPEN: 'statusNeutral',
  INVESTIGATING: 'statusInfo',
  KNOWN_ERROR: 'statusWarning',
  RESOLVED: 'statusSuccess',
  CLOSED: 'statusSuccess',
  CANCELLED: 'statusDanger',
}

const priorityClass = { 1: 'priorityP1', 2: 'priorityP2', 3: 'priorityP3', 4: 'priorityP4', 5: 'priorityP5' }

const Problem = () => {
  const router = useRouter()
  const details = getUserDetails()
  const [problems, setProblems] = useState({})
  const [currentPage, setCurrentPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [engineerList, setEngineerList] = useState([])
  const [showCreate, setShowCreate] = useState(false)

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
        apiUrl + '/auth/problem/get-all-page?page=' + page + '&size=' + size + (status ? '&status=' + status : '')
      const response = await fetch(url, { method: 'GET', headers: myHeaders, redirect: 'follow' })
      if (response.status === 401) {
        router.push('/')
        return
      }
      const data = await response.json()
      if (data !== null) setProblems(data)
    } catch (error) {
      console.error('Error fetching problems:', error)
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
        apiUrl + '/auth/problem/search?q=' + encodeURIComponent(search) + '&page=0&size=50',
        { method: 'GET', headers: myHeaders, redirect: 'follow' },
      )
      if (response.status === 401) {
        router.push('/')
        return
      }
      const data = await response.json()
      setProblems(data)
      setCurrentPage(0)
    } catch (error) {
      console.error('Error searching problems:', error)
    }
  }

  const gotToPage = (pageNo) => {
    getAll(pageNo, 10)
    setCurrentPage(pageNo)
  }

  const viewProblem = (id) => router.push(`/problem/${id}`)

  const handleCreate = (values) => {
    createProblem(values, router, () => {
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
          <h1 className={styles.pageTitle}>Problem Management</h1>
          <p className={styles.pageSubtitle}>Root cause analysis and known errors</p>
        </div>
        {canManage && (
          <button type="button" className={styles.addBtn} onClick={() => setShowCreate(true)}>
            + New Problem
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
              placeholder="Title, description, PRB ID..."
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
                getAll(0, 10, e.target.value)
              }}
            >
              <option value="">All</option>
              <option value="OPEN">Open</option>
              <option value="INVESTIGATING">Investigating</option>
              <option value="KNOWN_ERROR">Known Error</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="CANCELLED">Cancelled</option>
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
              setCurrentPage(0)
              getAll(0, 10, '')
            }}
          >
            Clear
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Problem</th>
                <th>Title</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Linked Incidents</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {problems.content?.map((p) => (
                <tr key={p.id}>
                  <td className={styles.idCell} onClick={() => viewProblem(p.id)}>
                    {p.problemId}
                  </td>
                  <td>{p.title}</td>
                  <td>
                    <span className={styles[priorityClass[p.priority] || 'priorityP3']}>P{p.priority}</span>
                  </td>
                  <td>
                    <span className={styles[statusClass[p.status] || 'statusNeutral']}>{p.status}</span>
                  </td>
                  <td className={styles.email}>{(p.linkedIncidentIds || []).length}</td>
                  <td className={styles.email}>
                    {p.modifyDate ? new Date(p.modifyDate).toLocaleDateString() : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {problems.content?.length === 0 && <div className={styles.emptyState}>No problems found</div>}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={problems.totalPages}
          onPageChange={gotToPage}
          variant="styled"
          styles={styles}
        />
      </div>

      {showCreate && (
        <ProblemModal
          title="New Problem"
          submitLabel="Create"
          engineerList={engineerList}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  )
}

export default Problem
