import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Swal from 'sweetalert2'
import * as XLSX from 'xlsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPenToSquare,
  faBan,
  faFilterCircleXmark,
  faMagnifyingGlass,
} from '@fortawesome/free-solid-svg-icons'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import Pagination from '@/components/ui/Pagination'
import CappedSelect from '@/components/ui/CappedSelect'

import styles from './purchase.module.scss'
import EditPurchaseModal from './EditPurchaseModal'

// Compact search-and-table view of purchase orders, used at /purchase-orders.
// Creating a new PO happens on /create-purchase instead.
const PurchaseOrdersSearch = () => {
  const details = getUserDetails()
  const router = useRouter()
  const [endClientList, setEndClientList] = useState([])
  const [salesList, setSalesList] = useState([])
  const [purchaseList, setPurchaseList] = useState({})
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedRows, setSelectedRows] = useState([])
  const [editId, setEditId] = useState(null)
  const [downloading, setDownloading] = useState(false)

  const [showFilters, setShowFilters] = useState(false)
  const [endClientFilter, setEndClientFilter] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')

  const getEndClientList = () => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    fetch(apiUrl + '/auth/end-client/get-all', requestOptions)
      .then((response) => (response.status === 401 ? router.push('/') : response.json()))
      .then((result) => {
        if (result !== null) {
          setEndClientList(result)
        }
      })
      .catch((error) => console.log('error', error))
  }

  const getSalesList = () => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    fetch(apiUrl + '/auth/sales-team/get-all-list', requestOptions)
      .then((response) => (response.status === 401 ? router.push('/') : response.json()))
      .then((result) => {
        if (result !== null) {
          setSalesList(result)
        }
      })
      .catch((error) => console.log('error', error))
  }

  const buildFilterQuery = (filters) => {
    const params = new URLSearchParams()
    if (filters.endClientId) params.set('endClientId', filters.endClientId)
    if (filters.search) params.set('search', filters.search)
    if (filters.status) params.set('status', filters.status)
    if (filters.startDate) params.set('startDate', filters.startDate)
    if (filters.endDate) params.set('endDate', filters.endDate)
    return params.toString()
  }

  const getPurchaseList = async (
    page,
    size,
    filters = {
      endClientId: endClientFilter,
      search: poNumber,
      status: statusFilter,
      startDate: startDateFilter,
      endDate: endDateFilter,
    },
  ) => {
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
      '/auth/purchase/get-all-page?page=' +
      page +
      '&size=' +
      size +
      (filterQuery ? '&' + filterQuery : '')

    try {
      const response = await fetch(url, requestOptions)
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setPurchaseList(data)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const applyFilters = () => {
    setCurrentPage(0)
    getPurchaseList(0, 10, {
      endClientId: endClientFilter,
      search: poNumber,
      status: statusFilter,
      startDate: startDateFilter,
      endDate: endDateFilter,
    })
  }

  const clearFilters = () => {
    setEndClientFilter('')
    setPoNumber('')
    setStatusFilter('')
    setStartDateFilter('')
    setEndDateFilter('')
    setCurrentPage(0)
    getPurchaseList(0, 10, { endClientId: '', search: '', status: '', startDate: '', endDate: '' })
  }

  const gotToPage = (pageNo) => {
    getPurchaseList(pageNo, 10)
    setCurrentPage(pageNo)
  }

  const editPurchaseHandler = (id) => {
    setEditId(id)
  }

  const expirePo = async (poNumber) => {
    Swal.fire({
      icon: 'warning',
      title: 'Are you sure you want to expire PO ?',
      showCancelButton: true,
      confirmButtonText: 'Expire',
      cancelButtonText: 'Cancel',
      customClass: { cancelButton: 'swal-cancel-light' },
    }).then(async (result) => {
      if (result.isConfirmed) {
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
            apiUrl + '/auth/purchase/po-expired?poNumber=' + poNumber,
            requestOptions,
          )
          if (response.status === 401) {
            router.push('/')
          } else {
            const data = await response.json()
            if (data !== null) {
              if (data?.statusCode === 200) {
                Swal.fire('Success', data.message, 'success').then(() => {
                  getPurchaseList(currentPage, 10)
                })
              } else {
                Swal.fire('Oops!', '' + data.message + '', 'warning')
              }
            }
          }
        } catch (error) {
          console.log('error', error)
        }
      }
    })
  }

  const exportRows = (rows) => {
    if (!rows.length) {
      Swal.fire('No data', 'There is nothing to download.', 'info')
      return
    }
    const sheetData = rows.map((r) => ({
      'PO Number': r.purchaseOrderNumber,
      'Start Date': r.startDate,
      'End Date': r.endDate,
      'PO Received Date': r.poReceiveDate,
      Type: r.type,
      Value: r.value,
      Status: r.status ? 'Active' : 'Deactive',
    }))
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(sheetData)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase Orders')
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const excelData = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const downloadLink = document.createElement('a')
    downloadLink.href = URL.createObjectURL(excelData)
    downloadLink.download = 'Purchase Orders.xlsx'
    downloadLink.click()
  }

  const downloadExcel = async () => {
    if (selectedRows.length > 0) {
      const rows = (purchaseList.content || []).filter((r) => selectedRows.includes(r.id))
      exportRows(rows)
      return
    }

    setDownloading(true)
    try {
      const myHeaders = new Headers()
      myHeaders.append('X-Tenant', '' + tenant + '')
      myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
      const response = await fetch(
        apiUrl + '/auth/purchase/get-all-page?page=0&size=100000',
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
    getEndClientList()
    getSalesList()
    getPurchaseList(0, 10)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div />
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={styles.filterClear}
            onClick={downloadExcel}
            disabled={downloading}
          >
            {downloading
              ? 'Downloading...'
              : selectedRows.length > 0
                ? `Download Excel (${selectedRows.length})`
                : 'Download Excel'}
          </button>
          <button
            type="button"
            className={styles.filterClear}
            onClick={() => setShowFilters((s) => !s)}
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} /> {showFilters ? 'Hide Search' : 'Search'}
          </button>
        </div>
      </div>

      {showFilters && (
      <div className={styles.card} style={{ marginBottom: 16 }}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardHeaderTitle}>Purchase Filters</h2>
        </div>
        <div className={styles.filterBar} style={{ borderBottom: 'none' }}>
          <div className={styles.filterField} style={{ flex: '1 1 260px' }}>
            <label className={styles.filterLabel}>End Client</label>
            <CappedSelect
              value={endClientFilter}
              onChange={(e) => setEndClientFilter(e.target.value)}
              options={endClientList?.map((element) => ({
                value: element.id,
                label: element.name,
              }))}
            />
          </div>
          <div className={styles.filterField} style={{ flex: '1 1 260px' }}>
            <label className={styles.filterLabel}>PO Number</label>
            <input
              type="text"
              className={styles.filterInput}
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <div className={styles.filterField} style={{ flex: '1 1 260px' }}>
            <label className={styles.filterLabel}>Status</label>
            <select
              className={styles.filterSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Deactive</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 12, flex: '1 1 260px' }}>
            <div className={styles.filterField} style={{ flex: '1 1 120px' }}>
              <label className={styles.filterLabel}>Start Date</label>
              <input
                type="date"
                className={styles.filterInput}
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
              />
            </div>
            <div className={styles.filterField} style={{ flex: '1 1 120px' }}>
              <label className={styles.filterLabel}>End Date</label>
              <input
                type="date"
                className={styles.filterInput}
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className={styles.filterFooter}>
          <button type="button" className={styles.applyBtn} onClick={applyFilters}>
            <FontAwesomeIcon icon={faMagnifyingGlass} /> Apply
          </button>
          <button type="button" className={styles.filterClear} onClick={clearFilters}>
            <FontAwesomeIcon icon={faFilterCircleXmark} /> Clear
          </button>
        </div>
      </div>
      )}

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardHeaderTitle}>Purchase Orders</h2>
          <span className={styles.selectedCount}>Selected - {selectedRows.length}</span>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.checkboxHeader}>
                  <input
                    type="checkbox"
                    checked={
                      purchaseList.content?.length > 0 &&
                      selectedRows.length === purchaseList.content?.length
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allIds = purchaseList.content?.map((option) => option.id)
                        setSelectedRows(allIds)
                      } else {
                        setSelectedRows([])
                      }
                    }}
                  />
                </th>
                <th>#</th>
                <th>PO Number</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>PO Received Date</th>
                <th>Type</th>
                <th>Value</th>
                <th>Status</th>
                <th className={styles.actionHeader}>Action</th>
              </tr>
            </thead>
            <tbody>
              {purchaseList.content?.map((option, index) => (
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
                  <td className={styles.email}>{purchaseList.number * purchaseList.size + index}</td>
                  <td className={styles.username}>{option.purchaseOrderNumber}</td>
                  <td className={styles.email}>{option.startDate}</td>
                  <td className={styles.email}>{option.endDate}</td>
                  <td className={styles.email}>{option.poReceiveDate}</td>
                  <td className={styles.email}>{option.type}</td>
                  <td className={styles.email}>INR {option.value}/-</td>
                  <td>
                    <span className={option.status ? styles.statusActive : styles.statusInactive}>
                      {option.status ? 'Active' : 'Deactive'}
                    </span>
                  </td>
                  <td className={styles.actionCell}>
                    <div className={styles.iconActionGroup}>
                      <button
                        type="button"
                        className={styles.iconActionEdit}
                        title="Edit"
                        onClick={() => editPurchaseHandler(option.id)}
                      >
                        <FontAwesomeIcon icon={faPenToSquare} />
                      </button>
                      {(details?.roles?.includes('ROLE_ADMIN') ||
                        details?.roles?.includes('ROLE_MODERATOR')) && (
                        <button
                          type="button"
                          className={styles.iconActionExpire}
                          title="Expire PO"
                          onClick={() => expirePo(option.purchaseOrderNumber)}
                        >
                          <FontAwesomeIcon icon={faBan} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {purchaseList.content?.length === 0 && (
            <div className={styles.emptyState}>No purchase orders found</div>
          )}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={purchaseList.totalPages}
          onPageChange={gotToPage}
          variant="styled"
          styles={styles}
        />
      </div>

      {editId && (
        <EditPurchaseModal
          purchaseId={editId}
          router={router}
          endClientList={endClientList}
          salesList={salesList}
          onClose={() => setEditId(null)}
          onSaved={() => getPurchaseList(currentPage, 10)}
        />
      )}
    </div>
  )
}

export default PurchaseOrdersSearch
