import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import moment from 'moment'
import * as XLSX from 'xlsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPrint,
  faPenToSquare,
  faUpload,
  faTruckRampBox,
} from '@fortawesome/free-solid-svg-icons'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import Delivery_Status from '@/components/model/Delivery_Status'
import Pod_Upload from '@/components/model/Pod_Upload'
import Pagination from '@/components/ui/Pagination'

import styles from './challan.module.scss'

const View_Chalan = () => {
  const router = useRouter()
  const details = getUserDetails()
  const [challanList, setChallanList] = useState({})
  const [currentPage, setCurrentPage] = useState(0)

  const [trackingStatus, setTrackingStatus] = useState([])
  const [trackingVisiable, setTrackingVisiable] = useState(false)
  const [challanDetails, setChallanDetails] = useState({})

  const [podUploadVisiable, setPodUploadVisiabel] = useState(false)
  const [podChallanDetails, setPodChallanDetails] = useState({})
  const [existingPod, setExistingPod] = useState({})

  const [selectedRows, setSelectedRows] = useState([])
  const [showFilters, setShowFilters] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // Filters
  const [incidentId, setIncidentId] = useState('')
  const [rmaNo, setRmaNo] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const canManage =
    details?.roles?.includes('ROLE_ADMIN') || details?.roles?.includes('ROLE_USER')

  const getAllChallans = async (
    page,
    size,
    filters = { startDate, endDate },
  ) => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    const params = new URLSearchParams()
    if (filters.startDate) params.set('startDate', filters.startDate)
    if (filters.endDate) params.set('endDate', filters.endDate)
    const filterQuery = params.toString()

    try {
      const response = await fetch(
        apiUrl +
          '/auth/core/challan/get-all-page?page=' +
          page +
          '&size=' +
          size +
          (filterQuery ? '&' + filterQuery : ''),
        requestOptions,
      )
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setChallanList(data)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const formatDate = (date) => (date ? moment(date).format('DD MMMM, YYYY') : '')

  const gotToPage = (pageNo) => {
    getAllChallans(pageNo, 10)
    setCurrentPage(pageNo)
  }

  const handelRmaView = (option) => {
    router.push('/rma/view/' + option.rmaRefId)
  }

  const getDeliveryTracking = (option) => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    fetch(apiUrl + '/auth/core/challan/get-delivery-status?id=' + option.id, requestOptions)
      .then((response) => response.json())
      .then((result) => {
        setTrackingStatus(result)
      })
      .catch((error) => console.log('error', error))
  }

  const handelTrackingView = (option) => {
    setTrackingVisiable(true)
    getDeliveryTracking(option)
    setChallanDetails(option)
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
        apiUrl + '/auth/core/challan/get-pod-details?id=' + option.id,
        requestOptions,
      )
      const result = await response.json()
      setExistingPod(result)
    } catch (error) {
      console.log('error', error)
    }
  }

  const handelPodUpload = (option) => {
    setPodUploadVisiabel(true)
    setPodChallanDetails(option)
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
          setChallanList(data)
        }
      }
    } catch (error) {
      console.log('error', error)
    }
  }

  const applyFilters = () => {
    setCurrentPage(0)
    if (incidentId) {
      runSearch(apiUrl + '/auth/core/challan/get-by-incident?page=0&size=5000&incidentId=' + incidentId)
    } else if (rmaNo) {
      runSearch(apiUrl + '/auth/core/challan/get-by-rma?page=0&size=5000&rmaNo=' + rmaNo)
    } else {
      getAllChallans(0, 10, { startDate, endDate })
    }
  }

  const clearFilters = () => {
    setIncidentId('')
    setRmaNo('')
    setStartDate('')
    setEndDate('')
    setCurrentPage(0)
    getAllChallans(0, 10, { startDate: '', endDate: '' })
  }

  const exportRows = (rows) => {
    if (!rows.length) {
      alert('No data to download!')
      return
    }
    const sheetData = rows.map((r) => ({
      'Challan No': r.challanNo,
      'RMA No': r.rmaId,
      'Challan Date': formatDate(r.date),
      PO: r.poNumber,
      Incident: r.incidentId,
      'Contact Person': r.toContactName,
      'Shipped By': r.deliveredBy,
    }))
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(sheetData)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Challans')

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const excelData = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    const downloadLink = document.createElement('a')
    downloadLink.href = URL.createObjectURL(excelData)
    downloadLink.download = 'Challans.xlsx'
    downloadLink.click()
  }

  const downloadAsExcel = async () => {
    if (selectedRows.length > 0) {
      const rows = (challanList.content || []).filter((r) => selectedRows.includes(r.id))
      exportRows(rows)
      return
    }

    setDownloading(true)
    try {
      const myHeaders = new Headers()
      myHeaders.append('X-Tenant', '' + tenant + '')
      myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      const response = await fetch(
        apiUrl + '/auth/core/challan/get-all-page?page=0&size=100000' +
          (params.toString() ? '&' + params.toString() : ''),
        { method: 'GET', headers: myHeaders, redirect: 'follow' },
      )
      if (response.status === 401) {
        router.push('/')
        return
      }
      const data = await response.json()
      exportRows(Array.isArray(data?.content) ? data.content : [])
    } catch (error) {
      console.log('error', error)
    } finally {
      setDownloading(false)
    }
  }

  useEffect(() => {
    getAllChallans(0, 10)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Delivery Challans</h1>
          <p className={styles.pageSubtitle}>Manage delivery challans</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={styles.filterClear}
            onClick={() => setShowFilters((s) => !s)}
          >
            {showFilters ? 'Hide Search' : 'Search'}
          </button>
          <button
            type="button"
            className={styles.filterClear}
            onClick={downloadAsExcel}
            disabled={downloading}
          >
            {downloading
              ? 'Downloading...'
              : selectedRows.length > 0
                ? `Download (${selectedRows.length})`
                : 'Download'}
          </button>
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
                  value={rmaNo}
                  onChange={(e) => setRmaNo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                />
              </div>
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
                <th className={styles.checkboxHeader}>
                  <input
                    type="checkbox"
                    checked={
                      challanList.content?.length > 0 &&
                      selectedRows.length === challanList.content?.length
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allIds = challanList.content?.map((option) => option.id)
                        setSelectedRows(allIds)
                      } else {
                        setSelectedRows([])
                      }
                    }}
                  />
                </th>
                <th className={styles.serialHeader}>#</th>
                <th className={styles.challanNoHeader}>Challan No</th>
                <th>RMA No</th>
                <th>Challan Date</th>
                <th>PO</th>
                <th>Incident</th>
                <th>Contact Person</th>
                <th>Shipped By</th>
                <th className={styles.actionHeader}>Action</th>
              </tr>
            </thead>
            <tbody>
              {challanList.content?.map((option, index) => (
                <tr key={option.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(option.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRows([...selectedRows, option.id])
                        } else {
                          setSelectedRows(selectedRows.filter((row) => row !== option.id))
                        }
                      }}
                    />
                  </td>
                  <td className={styles.email}>
                    {challanList.number * challanList.size + index}
                  </td>
                  <td className={styles.username}>{option.challanNo}</td>
                  <td className={styles.incidentIdCell} onClick={() => handelRmaView(option)}>
                    {option.rmaId}
                  </td>
                  <td className={styles.email}>{formatDate(option.date)}</td>
                  <td className={styles.email}>{option.poNumber}</td>
                  <td
                    className={styles.incidentIdCell}
                    onClick={() => router.push('/edit-incident/view/' + option.incidentRefId)}
                  >
                    {option.incidentId}
                  </td>
                  <td className={styles.email}>{option.toContactName}</td>
                  <td className={styles.email}>{option.deliveredBy}</td>
                  <td className={styles.actionCell}>
                    <div className={styles.iconActionGroup}>
                      <button
                        type="button"
                        className={styles.iconActionPrint}
                        title="Print Challan"
                        onClick={() => window.open('/print-challan/' + option.id, '_blank')}
                      >
                        <FontAwesomeIcon icon={faPrint} />
                      </button>
                      {canManage && (
                        <>
                          <button
                            type="button"
                            className={styles.iconActionEdit}
                            title="Edit Challan"
                            onClick={() => router.push('/edit-challans/' + option.id)}
                          >
                            <FontAwesomeIcon icon={faPenToSquare} />
                          </button>
                          <button
                            type="button"
                            className={styles.iconActionUpload}
                            title="Upload POD Against Challan"
                            onClick={() => handelPodUpload(option)}
                          >
                            <FontAwesomeIcon icon={faUpload} />
                          </button>
                          <button
                            type="button"
                            className={styles.iconActionTrack}
                            title="Add Tracking Details or Notes"
                            onClick={() => handelTrackingView(option)}
                          >
                            <FontAwesomeIcon icon={faTruckRampBox} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {challanList.content?.length === 0 && (
            <div className={styles.emptyState}>No delivery challans found</div>
          )}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={challanList.totalPages}
          onPageChange={gotToPage}
          variant="styled"
          styles={styles}
        />
      </div>

      <Delivery_Status
        visible={trackingVisiable}
        setVisible={setTrackingVisiable}
        challan={challanDetails}
        tracking={trackingStatus}
      />
      <Pod_Upload
        visible={podUploadVisiable}
        setVisible={setPodUploadVisiabel}
        challan={podChallanDetails}
        existingPod={existingPod}
        setExistingPod={setExistingPod}
      />
    </div>
  )
}

export default View_Chalan
