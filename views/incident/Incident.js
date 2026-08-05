/* eslint-disable react/jsx-pascal-case */
/* eslint-disable react/no-unescaped-entities */
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import moment from 'moment'
import * as XLSX from 'xlsx'
import Lottie from 'react-lottie'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import Incident_Details from '@/components/model/Incident_Details'
import New_Rma from '@/components/model/New_Rma'
import Incident_Notes from '@/components/model/Incident_Notes'
import Register_Location from '@/components/model/Register_Location'
import Incident_Status_Comment from '@/components/model/Incident_Status_Comment'
import { assignEngineer } from '@/api/incident_api'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import loader from '@/assets/lottie/loading.json'
import Pagination from '@/components/ui/Pagination'
import CappedSelect from '@/components/ui/CappedSelect'

import styles from './incident.module.scss'
import IncidentActionsMenu from './IncidentActionsMenu'
import EditIncidentModal from './EditIncidentModal'

const statusOptions = [
  'ASSIGNED TO FSE',
  'CLOSED',
  'NEED TO PLAN ENGINEER',
  'NOT CLOSED',
  'OPEN',
  'PENDING FOR DOWNTIME',
  'PENDING FOR LOGS',
  'PENDING FOR RMA',
  'PENDING FOR SPARE',
  'PENDING TO CLIENT',
  'PENDING TO VENDOR',
  'PENDING FOR RMA CLOSURE',
  'SPARE IN TRANSIT',
  'UNDER OBSERVATION',
  'WORK IN PROGRESS',
]

const engineerDisabledStatuses = ['ASSIGNED TO FSE', 'OPEN', 'PENDING FOR SPARE', 'RESOLVED']

const getStatusColor = (status) => {
  if (status === 'OPEN')
    return { bg: 'rgba(0, 200, 83, 0.14)', fg: '#0f9d58', rowBg: 'rgba(0, 200, 83, 0.06)' }
  if (status === 'CLOSED')
    return { bg: 'rgba(220, 38, 38, 0.14)', fg: '#dc2626', rowBg: 'rgba(220, 38, 38, 0.05)' }
  if (status === 'PENDING FOR RMA CLOSURE')
    return { bg: 'rgba(220, 38, 38, 0.28)', fg: '#b91c1c', rowBg: 'rgba(220, 38, 38, 0.1)' }
  if (['PENDING FOR LOGS', 'PENDING TO CLIENT', 'UNDER OBSERVATION'].includes(status))
    return { bg: 'rgba(37, 99, 235, 0.14)', fg: '#2563eb', rowBg: 'rgba(37, 99, 235, 0.06)' }
  if (['PENDING FOR RMA', 'PENDING FOR SPARE'].includes(status))
    return { bg: 'rgba(202, 138, 4, 0.16)', fg: '#a16207', rowBg: 'rgba(202, 138, 4, 0.07)' }
  if (status === 'SPARE IN TRANSIT')
    return { bg: 'rgba(13, 148, 136, 0.16)', fg: '#0d9488', rowBg: 'rgba(13, 148, 136, 0.06)' }
  return { bg: 'rgba(234, 88, 12, 0.14)', fg: '#c2410c', rowBg: 'rgba(234, 88, 12, 0.06)' }
}

const Create_Incident = () => {
  const details = getUserDetails()
  const [expandedRows, setExpandedRows] = useState([])
  const [incidents, setIncidents] = useState({})
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(0)

  const [incidentDetailModal, setIncidetDetailModal] = useState(false)
  const [incidentDetails, setIncidentDetails] = useState({})

  const [visibilityRma, setVisibilityRma] = useState(false)
  const [incidentDetailsForRma, setIncidentDetailsForRma] = useState({})

  const [visibilityLocation, setVisibilityLocation] = useState(false)
  const [location, setLocation] = useState('')

  const [visibilityNote, setVisibilityNote] = useState(false)
  const [incidentDetailsForNote, setIncidentDetailsForNote] = useState({})
  const [oldNotes, setOldNotes] = useState([])

  const [visibilityStatusComment, setVisibilityStatusComment] = useState(false)
  const [incidentDetailsStatusComment, setIncidentDetailsStatusComment] = useState({})
  const [statusValue, setStatusValue] = useState('')

  const [engineer, setEngineers] = useState([])

  const [isLoading, setIsLoading] = useState(false)

  const [showFilters, setShowFilters] = useState(false)
  const [editIncidentId, setEditIncidentId] = useState(null)

  // Filters
  const [incidentId, setIncidentId] = useState('')
  const [engineerId, setEngineerId] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const canFullSearch =
    details?.roles?.includes('ROLE_ADMIN') ||
    details?.roles?.includes('ROLE_USER') ||
    details?.roles?.includes('ROLE_MODERATOR')

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: loader,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice',
    },
  }
  const toggleLoader = () => {
    setIsLoading(!isLoading)
  }

  const openRegisterLocation = (item) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(function (position) {
        const { latitude, longitude } = position.coords
        setLocation(`${latitude.toFixed(4)},${longitude.toFixed(4)}`)
      })
    } else {
      console.log('Geolocation is not available in this browser.')
    }
    setVisibilityLocation(true, location)
  }
  const openIncidentDetail = (item) => {
    setIncidetDetailModal(true)
    setIncidentDetails(item)
  }
  const openRaiseRma = (item) => {
    setVisibilityRma(true)
    setIncidentDetailsForRma(item)
  }

  const openAddNote = (item) => {
    setVisibilityNote(true)
    setIncidentDetailsForNote(item)
    getNotesofIncident(item)
  }
  const handelIncidentViewPage = (item) => {
    window.open('/edit-incident/view/' + item.id, '_blank')
  }
  const getEnginners = async () => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    try {
      const response = await fetch(apiUrl + '/api/auth/users/get-engineers', requestOptions)
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setEngineers(data)
        }
      }
    } catch (error) {
      // console.error('Error fetching data:', error)
    }
  }
  const getNotesofIncident = async (item) => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    const requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    try {
      const response = await fetch(
        apiUrl + '/auth/incident/get-notes?incidentId=' + item.id + '',
        requestOptions,
      )
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        setOldNotes(data)
      }
    } catch (error) {
      console.log('Error:', error)
    }
  }
  const gotToPage = (pageNo) => {
    getIncidentPage(pageNo, 100)
    setCurrentPage(pageNo)
  }

  const getIncidentPage = async (page, size) => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    try {
      var response = null
      if (details?.roles?.includes('ROLE_ENGINEER') && details?.roles?.length === 1) {
        response = await fetch(
          apiUrl +
            '/auth/incident/incident-engineer-search?page=0&size=5000&engineerId=' +
            details?.id,
          requestOptions,
        )
      } else {
        response = await fetch(
          apiUrl + '/auth/incident/get-all-page?page=' + page + '&size=' + size + '',
          requestOptions,
        )
      }

      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setIncidents(data)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const handleRowClick = (item) => {
    const isExpanded = expandedRows.includes(item.id)
    if (isExpanded) {
      setExpandedRows(expandedRows.filter((rowId) => rowId !== item.id))
    } else {
      setExpandedRows([...expandedRows, item.id])
    }
  }

  const runSearch = async (url) => {
    setIsLoading(true)
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
          setIncidents(data)
        }
      }
    } catch (error) {
      console.log('error', error)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    setCurrentPage(0)
    if (startDate && endDate) {
      runSearch(
        apiUrl +
          '/auth/incident/incident-between-dates?pageNo=0&size=50000&endDate=' +
          endDate +
          '&startDate=' +
          startDate,
      )
    } else if (incidentId) {
      runSearch(
        apiUrl + '/auth/incident/incident-id-search?page=0&size=5000&incidentId=' + incidentId,
      )
    } else if (poNumber) {
      runSearch(apiUrl + '/auth/incident/incident-po-search?page=0&size=5000&poNumber=' + poNumber)
    } else if (serialNumber) {
      runSearch(
        apiUrl +
          '/auth/incident/incident-serial-search?page=0&size=5000&serialNumber=' +
          serialNumber,
      )
    } else if (engineerId) {
      runSearch(
        apiUrl + '/auth/incident/incident-engineer-search?page=0&size=5000&engineerId=' + engineerId,
      )
    } else if (statusFilter) {
      runSearch(
        apiUrl + '/auth/incident/incident-by-status?page=0&size=10&status=' + statusFilter,
      )
    } else {
      getIncidentPage(0, 100)
    }
  }

  const clearFilters = () => {
    setIncidentId('')
    setEngineerId('')
    setPoNumber('')
    setSerialNumber('')
    setStatusFilter('')
    setStartDate('')
    setEndDate('')
    setCurrentPage(0)
    getIncidentPage(0, 100)
  }

  const handelIncidentStatus = async (e, incident) => {
    setVisibilityStatusComment(true)
    setIncidentDetailsStatusComment(incident)
    setStatusValue(e.target.value)
  }
  const handelEngineerAssign = async (e, incidentId) => {
    assignEngineer(e.target.value, incidentId, router, getIncidentPage, currentPage, setIsLoading)
  }

  const downloadAsExcel = () => {
    if (Array.isArray(incidents.content) && incidents.content.length > 0) {
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(incidents.content)
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const excelData = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

      const downloadLink = document.createElement('a')
      downloadLink.href = URL.createObjectURL(excelData)
      downloadLink.download = 'Incidents Page-' + currentPage + '.xlsx'
      downloadLink.click()
    } else {
      alert('No data to download!')
    }
  }
  const formatDate = (date) => {
    return moment(date).format('DD/MM/YYYY')
  }
  const formatTime = (date) => {
    return moment(date).format('hh:mm A')
  }

  useEffect(() => {
    getIncidentPage(0, 100)
    getEnginners()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      {isLoading && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              cursor: 'pointer',
              color: 'white',
            }}
            onClick={toggleLoader}
          >
            <FontAwesomeIcon icon={faTimes} />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}
          >
            <Lottie options={defaultOptions} height={100} width={100} />
          </div>
        </div>
      )}

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Incidents</h1>
          <p className={styles.pageSubtitle}>Track and manage incidents</p>
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
              <label className={styles.filterLabel}>Engineer</label>
              <CappedSelect
                value={engineerId}
                onChange={(e) => setEngineerId(e.target.value)}
                options={engineer?.map((element) => ({
                  value: element.id,
                  label: `${element.firstName} ${element.lastName}`,
                }))}
              />
            </div>
            {canFullSearch && (
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
            )}
          </div>
          <div className={styles.filterRow}>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Serial Number</label>
              <input
                type="text"
                className={styles.filterInput}
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              />
            </div>
            {canFullSearch && (
              <div className={styles.filterField}>
                <label className={styles.filterLabel}>Status</label>
                <CappedSelect
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={statusOptions.map((s) => ({ value: s, label: s }))}
                />
              </div>
            )}
            {canFullSearch && (
              <>
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
              </>
            )}
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
                <th>Incident ID</th>
                <th>EndClient</th>
                <th className={styles.statusHeader}>Status</th>
                <th>FrontClient</th>
                <th>State</th>
                <th>Model</th>
                <th>Serial No</th>
                <th>Contact Name</th>
                <th>Contact No</th>
              </tr>
            </thead>
            <tbody>
              {incidents.content?.map((item) => {
                const color = getStatusColor(item.status)
                const expanded = expandedRows.includes(item.id)
                return (
                  <React.Fragment key={item.id}>
                    <tr
                      className={styles.incidentRow}
                      style={{ background: color.rowBg }}
                      onClick={() => handleRowClick(item)}
                    >
                      <td className={styles.incidentIdCell}>{item.incidentId}</td>
                      <td className={styles.email}>{item.endClientName}</td>
                      <td className={styles.statusCell}>
                        <span
                          className={styles.statusBadge}
                          style={{ background: color.bg, color: color.fg }}
                          title={item.status}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className={styles.email}>{item.frontClientName}</td>
                      <td className={styles.email}>{item.state}</td>
                      <td className={styles.email}>{item.model}</td>
                      <td className={styles.email}>{item.serialNumber}</td>
                      <td className={styles.email}>{item.contactName}</td>
                      <td className={styles.email}>{item.contactNumber}</td>
                    </tr>
                    {expanded && (
                      <tr className={styles.expandedRow}>
                        <td colSpan={9}>
                          <div className={styles.expandedPanel}>
                            <div className={styles.expandedField}>
                              <span className={styles.expandedLabel}>PO Number</span>
                              <span className={styles.expandedValue}>
                                {item.purchaseOrderNumber}
                              </span>
                            </div>
                            <div className={styles.expandedField}>
                              <span className={styles.expandedLabel}>Closed Date</span>
                              <span className={styles.expandedValue}>
                                {item?.closeDate
                                  ? `${formatDate(item.closeDate)} · ${formatTime(item.closeDate)}`
                                  : 'Not closed yet'}
                              </span>
                            </div>
                            <div className={styles.expandedField}>
                              <span className={styles.expandedLabel}>Engineer (Owner)</span>
                              <CappedSelect
                                value={item.engineerId || ''}
                                disabled={
                                  !(
                                    details?.roles?.includes('ROLE_ADMIN') ||
                                    details?.roles?.includes('ROLE_USER')
                                  )
                                }
                                onChange={(e) => handelEngineerAssign(e, item.id)}
                                options={engineer?.map((element) => ({
                                  value: element.id,
                                  label: `${element.firstName} ${element.lastName}`,
                                }))}
                              />
                            </div>
                            <div className={styles.expandedField}>
                              <span className={styles.expandedLabel}>Status</span>
                              {(details?.roles?.includes('ROLE_ADMIN') ||
                                details?.roles?.includes('ROLE_USER')) && (
                                <CappedSelect
                                  value={item.status || ''}
                                  onChange={(e) => handelIncidentStatus(e, item)}
                                  options={statusOptions.map((s) => ({ value: s, label: s }))}
                                />
                              )}
                              {details?.roles?.includes('ROLE_ENGINEER') &&
                                details?.roles?.length === 1 && (
                                  <CappedSelect
                                    value={item.status || ''}
                                    onChange={(e) => handelIncidentStatus(e, item)}
                                    options={statusOptions
                                      .filter((s) => !engineerDisabledStatuses.includes(s))
                                      .map((s) => ({ value: s, label: s }))}
                                  />
                                )}
                            </div>
                            <div className={styles.expandedField}>
                              <span className={styles.expandedLabel}>Quick Actions</span>
                              <IncidentActionsMenu
                                canRaiseRma={
                                  details?.roles?.includes('ROLE_ADMIN') ||
                                  details?.roles?.includes('ROLE_USER')
                                }
                                canEdit={
                                  details?.roles?.includes('ROLE_ADMIN') ||
                                  details?.roles?.includes('ROLE_USER')
                                }
                                canRegisterLocation={details?.roles?.includes('ROLE_ADMIN')}
                                onRaiseRma={() => openRaiseRma(item)}
                                onAddNote={() => openAddNote(item)}
                                onEdit={() => setEditIncidentId(item.id)}
                                onView={() => openIncidentDetail(item)}
                                onRegisterLocation={() => openRegisterLocation(item)}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
          {incidents.content?.length === 0 && (
            <div className={styles.emptyState}>No incidents found</div>
          )}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={incidents.totalPages}
          onPageChange={gotToPage}
          variant="styled"
          styles={styles}
        />
      </div>

      <Incident_Details
        visible={incidentDetailModal}
        setVisible={setIncidetDetailModal}
        details={incidentDetails}
      />
      <New_Rma
        visible={visibilityRma}
        setVisible={setVisibilityRma}
        incident={incidentDetailsForRma}
      />
      <Incident_Notes
        visible={visibilityNote}
        setVisible={setVisibilityNote}
        incident={incidentDetailsForNote}
        oldNotes={oldNotes}
      />
      <Register_Location visible={visibilityLocation} setVisible={setVisibilityLocation} />
      <Incident_Status_Comment
        statusValue={statusValue}
        Incident={incidentDetailsStatusComment}
        visible={visibilityStatusComment}
        getIncidentPage={getIncidentPage}
        currentPage={currentPage}
        setVisible={setVisibilityStatusComment}
      />

      {editIncidentId && (
        <EditIncidentModal
          incidentId={editIncidentId}
          router={router}
          engineerList={engineer}
          onClose={() => setEditIncidentId(null)}
          onSaved={() => getIncidentPage(currentPage, 100)}
        />
      )}
    </div>
  )
}

export default Create_Incident
