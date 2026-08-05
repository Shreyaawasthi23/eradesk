import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import moment from 'moment'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'

import styles from './logs.module.scss'
import Pagination from '@/components/ui/Pagination'

const Logs = () => {
  const details = getUserDetails()
  const router = useRouter()
  const [logList, setLogList] = useState({})
  const [currentPage, setCurrentPage] = useState(0)

  const [search, setSearch] = useState('')

  const buildFilterQuery = (filters) => {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    return params.toString()
  }

  const getLogs = (page, size, filters = { search }) => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    const filterQuery = buildFilterQuery(filters)
    const url =
      apiUrl +
      '/api/auth/logs/get-all?page=' +
      page +
      '&size=' +
      size +
      (filterQuery ? '&' + filterQuery : '')

    fetch(url, requestOptions)
      .then((response) => (response.status === 401 ? router.push('/') : response.json()))
      .then((result) => {
        if (result !== null) {
          setLogList(result)
        }
      })
      .catch((error) => {})
  }

  const gotToPage = (pageNo) => {
    getLogs(pageNo, 10)
    setCurrentPage(pageNo)
  }

  const applyFilters = () => {
    setCurrentPage(0)
    getLogs(0, 10)
  }

  const clearFilters = () => {
    setSearch('')
    setCurrentPage(0)
    getLogs(0, 10, { search: '' })
  }

  const formatDate = (date) => moment(date).format('DD/MM/YYYY hh:mm:ss A')

  useEffect(() => {
    getLogs(0, 10)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Logs</h1>
          <p className={styles.pageSubtitle}>Login history for all users</p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.filterBar}>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Search</label>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="Search by email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <button type="button" className={styles.applyBtn} onClick={applyFilters}>
            Apply
          </button>
          <button type="button" className={styles.filterClear} onClick={clearFilters}>
            Clear
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Email</th>
                <th>Login Time</th>
              </tr>
            </thead>
            <tbody>
              {logList.content?.map((log, index) => (
                <tr key={log.id}>
                  <td>{logList.number * logList.size + index}</td>
                  <td className={styles.email}>{log.email}</td>
                  <td className={styles.email}>{formatDate(log.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {logList.content?.length === 0 && (
            <div className={styles.emptyState}>No login history found</div>
          )}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={logList.totalPages}
          onPageChange={gotToPage}
          styles={styles}
        />
      </div>
    </div>
  )
}

export default Logs
