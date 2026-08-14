import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import * as XLSX from 'xlsx'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { UpdateRmaStatus } from '@/api/rma_api'
import RmaPod_Upload from '@/components/model/RmaPod_Upload'
import Pagination from '@/components/ui/Pagination'
import CappedSelect from '@/components/ui/CappedSelect'

import styles from './rma.module.scss'
import RmaActionsMenu from './RmaActionsMenu'

const statusOptions = ['PENDING', 'WAITING FOR FAULTY RETURN', 'CLOSED', 'CANCELED']

const getStatusColor = (status) => {
  if (status === 'CLOSED') return { bg: 'rgba(0, 200, 83, 0.14)', fg: '#0f9d58' }
  if (status === 'CANCELED') return { bg: 'rgba(220, 38, 38, 0.14)', fg: '#dc2626' }
  if (status === 'WAITING FOR FAULTY RETURN') return { bg: 'rgba(37, 99, 235, 0.14)', fg: '#2563eb' }
  return { bg: 'rgba(202, 138, 4, 0.16)', fg: '#a16207' }
}

const RMA = () => {
  const router = useRouter()
  const details = getUserDetails()
  const [rmaList, setRmaList] = useState({})
  const [currentPage, setCurrentPage] = useState(0)

  const [podUploadVisiable, setPodUploadVisiabel] = useState(false)
  const [podRmaDetails, setPodRmaDetails] = useState({})
  const [existingPod, setExistingPod] = useState({})

  const [showFilters, setShowFilters] = useState(false)

  // Filters
  const [incidentId, setIncidentId] = useState('')
  const [rmaNumber, setRmaNumber] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const canFullSearch =
    details?.roles?.includes('ROLE_ADMIN') ||
    details?.roles?.includes('ROLE_USER') ||
    details?.roles?.includes('ROLE_MODERATOR')

  const getAllRma = async (page, size) => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    try {
      const response = await fetch(
        apiUrl + '/auth/rma/get-all?page=' + page + '&size=' + size + '',
        requestOptions,
      )
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setRmaList(data)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const gotToPage = (pageNo) => {
    getAllRma(pageNo, 10)
    setCurrentPage(pageNo)
  }

  const handelIncidentClick = (incidentRefId) => {
    router.push('/edit-incident/view/' + incidentRefId)
  }

  const ViewRma = (rmaDetails) => {
    router.push(`/rma/view/${rmaDetails.id}`)
  }

  const handelRmaStatusUpdate = (e, rmaId) => {
    UpdateRmaStatus(e.target.value, rmaId, router, () => getAllRma(currentPage, 10))
  }

  const handelExistingPod = async (option) => {
    try {
      const myHeaders = new Headers()
      myHeaders.append('X-Tenant', '' + tenant + '')
      myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

      const requestOptions = {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      }

      const response = await fetch(
        apiUrl + '/auth/rma/get-rma-pod-details?id=' + option.id,
        requestOptions,
      )
      const result = await response.json()
      setExistingPod(result)
    } catch (error) {
      console.log('error', error)
    }
  }

  const handelPodUpload = (option) => {
    setPodRmaDetails(option)
    setPodUploadVisiabel(true)
    handelExistingPod(option)
  }

  const runSearch = async (url) => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    try {
      const response = await fetch(url, requestOptions)
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setRmaList(data)
        }
      }
    } catch (error) {
      console.log('error', error)
    }
  }

  const applyFilters = () => {
    setCurrentPage(0)
    if (startDate && endDate) {
      runSearch(
        apiUrl +
          '/auth/rma/rma-between-dates?pageNo=0&size=50000&endDate=' +
          endDate +
          '&startDate=' +
          startDate,
      )
    } else if (incidentId) {
      runSearch(apiUrl + '/auth/rma/get-by-incident?page=0&size=5000&incidentId=' + incidentId)
    } else if (rmaNumber) {
      runSearch(apiUrl + '/auth/rma/rma-search?page=0&size=5000&rmaNumber=' + rmaNumber)
    } else if (poNumber) {
      runSearch(apiUrl + '/auth/rma/rma-by-po?page=0&size=5000&purchaseOrder=' + poNumber)
    } else {
      getAllRma(0, 10)
    }
  }

  const clearFilters = () => {
    setIncidentId('')
    setRmaNumber('')
    setPoNumber('')
    setStartDate('')
    setEndDate('')
    setCurrentPage(0)
    getAllRma(0, 10)
  }

  const downloadAsExcel = () => {
    if (Array.isArray(rmaList.content) && rmaList.content.length > 0) {
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(rmaList.content)
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const excelData = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

      const downloadLink = document.createElement('a')
      downloadLink.href = URL.createObjectURL(excelData)
      downloadLink.download = 'RMA Page-' + currentPage + '.xlsx'
      downloadLink.click()
    } else {
      alert('No data to download!')
    }
  }

  useEffect(() => {
    getAllRma(0, 10)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>RMA Requests</h1>
          <p className={styles.pageSubtitle}>Track and manage RMA requests</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={styles.filterClear}
            onClick={() => setShowFilters((s) => !s)}
          >
            {showFilters ? 'Hide Search' : 'Search'}
          </button>
          {canFullSearch && (
            <button type="button" className={styles.filterClear} onClick={downloadAsExcel}>
              Download
            </button>
          )}
        </div>
      </div>

      <div className={styles.card}>
        {showFilters && (
          <div className={styles.filterBar}>
            <div className={styles.filterRow}>
              <div className={styles.filterField}>
                <label className={styles.filterLabel}>Incident Id</label>
                <input
                  type="text"
                  className={styles.filterInput}
                  value={incidentId}
                  onChange={(e) => setIncidentId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                />
              </div>
              <div className={styles.filterField}>
                <label className={styles.filterLabel}>RMA Number</label>
                <input
                  type="text"
                  className={styles.filterInput}
                  value={rmaNumber}
                  onChange={(e) => setRmaNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                />
              </div>
              <div className={styles.filterField}>
                <label className={styles.filterLabel}>PO Number</label>
                <input
                  type="text"
                  className={styles.filterInput}
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                />
              </div>
            </div>
            <div className={styles.filterRow}>
              <div className={styles.filterField}>
                <label className={styles.filterLabel}>Start Date</label>
                <input
                  type="date"
                  className={styles.filterInput}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className={styles.filterField}>
                <label className={styles.filterLabel}>End Date</label>
                <input
                  type="date"
                  className={styles.filterInput}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <button type="button" className={styles.applyBtn} onClick={applyFilters}>
                Apply
              </button>
              <button type="button" className={styles.filterClear} onClick={clearFilters}>
                Clear
              </button>
            </div>
          </div>
        )}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>RMA #</th>
                <th>Date</th>
                <th>Status</th>
                <th>Incident</th>
                <th>End Client</th>
                <th className={styles.actionHeader}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rmaList.content?.map((option) => {
                const color = getStatusColor(option.status)
                return (
                  <tr key={option.id}>
                    <td className={styles.incidentIdCell} onClick={() => ViewRma(option)}>
                      {option.rmaId}
                    </td>
                    <td className={styles.email}>{option.createDate}</td>
                    <td className={styles.statusCell}>
                      <CappedSelect
                        value={option.status || ''}
                        onChange={(e) => handelRmaStatusUpdate(e, option.id)}
                        options={statusOptions.map((s) => ({ value: s, label: s }))}
                      />
                    </td>
                    <td
                      className={styles.incidentIdCell}
                      onClick={() => handelIncidentClick(option.incidentRefId)}
                    >
                      {option.incidentId}
                    </td>
                    <td className={styles.email}>{option.endClientName}</td>
                    <td className={styles.actionCell}>
                      <RmaActionsMenu
                        canUploadPod={
                          details?.roles?.includes('ROLE_ADMIN') ||
                          details?.roles?.includes('ROLE_USER')
                        }
                        onView={() => ViewRma(option)}
                        onUploadPod={() => handelPodUpload(option)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rmaList.content?.length === 0 && (
            <div className={styles.emptyState}>No RMA requests found</div>
          )}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={rmaList.totalPages}
          onPageChange={gotToPage}
          variant="styled"
          styles={styles}
        />
      </div>

      <RmaPod_Upload
        visible={podUploadVisiable}
        setVisible={setPodUploadVisiabel}
        rma={podRmaDetails}
        existingPod={existingPod}
        setExistingPod={setExistingPod}
      />
    </div>
  )
}

export default RMA
