import { useFormik } from 'formik'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Swal from 'sweetalert2'
import * as XLSX from 'xlsx'
import * as Yup from 'yup'
import { createEndClient } from '@/apiClients/endclient_api'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'

import styles from './endclient.module.scss'
import EditEndClientModal from './EditEndClientModal'
import CappedSelect from '@/components/ui/CappedSelect'
import MultiSelect from '@/components/ui/MultiSelect'
import Pagination from '@/components/ui/Pagination'

const avatarPalette = ['#2E86DE', '#22C58B', '#8E44AD', '#F4623A', '#17A2A8', '#D35400']
const initials = (name) => (name ? name.charAt(0).toUpperCase() : '?')

const End_Client = () => {
  const details = getUserDetails()
  const router = useRouter()
  const [frontClientList, setFrontClientList] = useState([])
  const [salesList, setSalesList] = useState([])
  const [endClientList, setEndClientList] = useState({})
  const [currentPage, setCurrentPage] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [selectedRows, setSelectedRows] = useState([])
  const [downloading, setDownloading] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const buildFilterQuery = (filters) => {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.status) params.set('status', filters.status)
    return params.toString()
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

    fetch(apiUrl + '/auth/core/sales-team/get-all-list', requestOptions)
      .then((response) => (response.status === 401 ? router.push('/') : response.json()))
      .then((result) => {
        if (result !== null) {
          setSalesList(result)
        }
      })
      .catch((error) => console.log('error', error))
  }

  const getFrontCLients = () => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    fetch(apiUrl + '/auth/core/front-client/get-all-list', requestOptions)
      .then((response) => (response.status === 401 ? router.push('/') : response.json()))
      .then((result) => {
        if (result !== null) {
          setFrontClientList(result)
        }
      })
      .catch((error) => console.log('error', error))
  }

  const getEndClientList = async (page, size, filters = { search, status: statusFilter }) => {
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
      '/auth/core/end-client/get-all-page?page=' +
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
          setEndClientList(data)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const gotToPage = (pageNo) => {
    getEndClientList(pageNo, 10)
    setCurrentPage(pageNo)
  }

  const editEndClientHandler = (id) => {
    setEditId(id)
  }

  const applyFilters = () => {
    setCurrentPage(0)
    getEndClientList(0, 10)
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('')
    setCurrentPage(0)
    getEndClientList(0, 10, { search: '', status: '' })
  }

  const exportRows = (rows) => {
    if (!rows.length) {
      Swal.fire('No data', 'There is nothing to download.', 'info')
      return
    }
    const salesNameById = new Map(salesList?.map((s) => [s.id, s.name]) || [])
    const sheetData = rows.map((r) => ({
      'End Client ID': r.endClientId,
      Name: r.name,
      'Front Client ID': r.frontClientId,
      'Contact Person': r.contactName,
      'Contact Number': r.contactNumber,
      'Sales Person(s)': (r.salesIds || []).map((id) => salesNameById.get(id)).filter(Boolean).join(', '),
      'Contact Email': r.contactEmail,
      Status: r.status ? 'Active' : 'Deactive',
      'Create Date': r.createDate ? new Date(r.createDate).toLocaleString() : '',
    }))
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(sheetData)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'End Clients')
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const excelData = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const downloadLink = document.createElement('a')
    downloadLink.href = URL.createObjectURL(excelData)
    downloadLink.download = 'End Clients.xlsx'
    downloadLink.click()
  }

  const downloadExcel = async () => {
    if (selectedRows.length > 0) {
      const rows = (endClientList.content || []).filter((r) => selectedRows.includes(r.id))
      exportRows(rows)
      return
    }

    setDownloading(true)
    try {
      var myHeaders = new Headers()
      myHeaders.append('X-Tenant', '' + tenant + '')
      myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
      const response = await fetch(apiUrl + '/auth/core/end-client/get-all?status=all', {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      })
      if (response.status === 401) {
        router.push('/')
        return
      }
      const rows = await response.json()
      exportRows(Array.isArray(rows) ? rows : [])
    } catch (error) {
      console.log('error', error)
    } finally {
      setDownloading(false)
    }
  }

  const handelFClientSelect = (e, formik) => {
    if (e.target.value !== 'Select') {
      const client = frontClientList.find((client) => client.id === e.target.value)
      Swal.fire({
        title: 'Alert',
        text: 'Do you want End Client to be same as Front Client (' + client.name + ') ?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes',
      }).then((result) => {
        if (result.isConfirmed) {
          formik.setFieldValue(e.target.name, e.target.value)
          formik.setFieldValue('name', client.name)
          formik.setFieldValue('contactName', client.contactName)
          formik.setFieldValue('contactNumber', client.contactNumber)
          formik.setFieldValue('contactEmail', client.contactEmail)
          formik.setFieldValue('salesIds', client.salesIds || [])
        } else {
          formik.setFieldValue(e.target.name, e.target.value)
          formik.setFieldValue('name', '')
          formik.setFieldValue('contactName', '')
          formik.setFieldValue('contactNumber', '')
          formik.setFieldValue('contactEmail', '')
          formik.setFieldValue('salesIds', [])
        }
      })
    }
  }

  const formik = useFormik({
    initialValues: {
      name: '',
      contactName: '',
      contactNumber: '',
      contactEmail: '',
      frontClientId: '',
      userId: details?.id,
      status: true,
      salesIds: [],
    },
    validationSchema: Yup.object({
      frontClientId: Yup.string().required('Required'),
      name: Yup.string().max(100, 'Must be 100 characters or less').required('Required'),
      contactName: Yup.string().required(),
      contactNumber: Yup.string()
        .min(10, 'Must be 10 characters')
        .max(11, 'Must not be more than 11 characters')
        .required('Required')
        .matches(/^[0-9]+$/, 'Invalid input. Only numbers are allowed.'),
      contactEmail: Yup.string().email('Invalid email address').required('Required'),
      status: Yup.boolean()
        .required('Status is required')
        .oneOf([true, false], 'Invalid input. Please select a value.'),
    }),
    onSubmit: (values) => {
      createEndClient(values, router)
    },
  })

  useEffect(() => {
    getFrontCLients()
    getSalesList()
    getEndClientList(0, 10)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>End Clients</h1>
          <p className={styles.pageSubtitle}>
            Manage end-client accounts
            {selectedRows.length > 0 ? ` · ${selectedRows.length} selected` : ''}
          </p>
        </div>
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
          <button type="button" className={styles.addBtn} onClick={() => setShowModal(true)}>
            + Add New Client
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.filterBar}>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Search</label>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="Name, contact, or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <div className={styles.filterField}>
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
                <th>
                  <input
                    type="checkbox"
                    checked={
                      endClientList.content?.length > 0 &&
                      selectedRows.length === endClientList.content?.length
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRows(endClientList.content?.map((option) => option.id) || [])
                      } else {
                        setSelectedRows([])
                      }
                    }}
                  />
                </th>
                <th>#</th>
                <th>Name</th>
                <th>End Client ID</th>
                <th>Contact Person</th>
                <th>Contact Number</th>
                <th>Contact Email</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {endClientList.content?.map((option, index) => (
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
                  <td>{endClientList.number * endClientList.size + index}</td>
                  <td>
                    <div className={styles.userCell}>
                      <div
                        className={styles.avatar}
                        style={{ background: avatarPalette[index % avatarPalette.length] }}
                      >
                        {initials(option.name)}
                      </div>
                      <span className={styles.username}>{option.name}</span>
                    </div>
                  </td>
                  <td className={styles.email}>{option.endClientId}</td>
                  <td className={styles.email}>{option.contactName}</td>
                  <td className={styles.email}>{option.contactNumber}</td>
                  <td className={styles.email}>{option.contactEmail}</td>
                  <td>
                    <span className={option.status ? styles.statusActive : styles.statusInactive}>
                      {option.status ? 'Active' : 'Deactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.editBtn}
                      onClick={() => editEndClientHandler(option.id)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {endClientList.content?.length === 0 && (
            <div className={styles.emptyState}>No end clients found</div>
          )}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={endClientList.totalPages}
          onPageChange={gotToPage}
          styles={styles}
        />
      </div>

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Create End Client</h2>
              <button type="button" className={styles.modalClose} onClick={() => setShowModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={formik.handleSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  <div className={`${styles.formField} ${styles.full}`}>
                    <label className={styles.formLabel}>Front Client</label>
                    <CappedSelect
                      name="frontClientId"
                      value={formik.values.frontClientId}
                      onChange={(e) => handelFClientSelect(e, formik)}
                      onBlur={formik.handleBlur}
                      options={frontClientList?.map((element) => ({
                        value: element.id,
                        label: element.name,
                      }))}
                    />
                    {formik.touched.frontClientId && formik.errors.frontClientId && (
                      <span className={styles.formFeedbackInvalid}>{formik.errors.frontClientId}</span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Name</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      name="name"
                      value={formik.values.name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched.name && formik.errors.name && (
                      <span className={styles.formFeedbackInvalid}>{formik.errors.name}</span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Contact Name</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      name="contactName"
                      value={formik.values.contactName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched.contactName && formik.errors.contactName && (
                      <span className={styles.formFeedbackInvalid}>{formik.errors.contactName}</span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Contact Number</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      name="contactNumber"
                      value={formik.values.contactNumber}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched.contactNumber && formik.errors.contactNumber && (
                      <span className={styles.formFeedbackInvalid}>{formik.errors.contactNumber}</span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Contact Email</label>
                    <input
                      type="email"
                      className={styles.formInput}
                      name="contactEmail"
                      value={formik.values.contactEmail}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched.contactEmail && formik.errors.contactEmail && (
                      <span className={styles.formFeedbackInvalid}>{formik.errors.contactEmail}</span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Sales Team</label>
                    <MultiSelect
                      name="salesIds"
                      value={formik.values.salesIds}
                      onChange={(e) => formik.setFieldValue('salesIds', e.target.value)}
                      onBlur={formik.handleBlur}
                      placeholder="Select sales team"
                      options={salesList?.map((element) => ({
                        value: element.id,
                        label: element.name,
                      }))}
                    />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Status</label>
                    <select
                      className={styles.filterSelect}
                      name="status"
                      value={formik.values.status}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    >
                      <option value={true}>Active</option>
                      <option value={false}>Deactive</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.submitBtn}>
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editId && (
        <EditEndClientModal
          clientId={editId}
          router={router}
          frontClientList={frontClientList}
          salesList={salesList}
          onClose={() => setEditId(null)}
          onSaved={() => getEndClientList(currentPage, 10)}
        />
      )}
    </div>
  )
}

export default End_Client
