import { useFormik } from 'formik'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'
import { createFrontClient } from '@/api/frontclient_api'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import * as Yup from 'yup'

import styles from './frontclient.module.scss'
import EditFrontClientModal from './EditFrontClientModal'
import Pagination from '@/components/ui/Pagination'
import MultiSelect from '@/components/ui/MultiSelect'

const avatarPalette = ['#2E86DE', '#22C58B', '#8E44AD', '#F4623A', '#17A2A8', '#D35400']
const initials = (name) => (name ? name.charAt(0).toUpperCase() : '?')

const Create_Client = () => {
  const details = getUserDetails()
  const router = useRouter()
  const [frontClientsList, setFrontClientsList] = useState({})
  const [salesList, setSalesList] = useState([])
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

  const validateUserName = async (value) => {
    const filteredValue = value.replace(/[!@$%^&*+=/*{}[\]|\\;:]/g, '')
    try {
      var myHeaders = new Headers()
      myHeaders.append('X-Tenant', '' + tenant + '')
      myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

      var requestOptions = {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      }

      const response = await fetch(
        apiUrl + '/auth/front-client/check-by-name?name=' + filteredValue,
        requestOptions,
      )
      if (response.status === 401) {
        router.push('/')
      }
      const data = await response.json()
      if (data.statusCode === 200) {
        return true
      } else {
        return false
      }
    } catch (error) {
      throw error
    }
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

  const getFrontCLients = async (page, size, filters = { search, status: statusFilter }) => {
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
      '/auth/front-client/get-all?page=' +
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
          setFrontClientsList(data)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const gotToPage = (pageNo) => {
    getFrontCLients(pageNo, 10)
    setCurrentPage(pageNo)
  }

  const editFrontClient = (id) => {
    setEditId(id)
  }

  const applyFilters = () => {
    setCurrentPage(0)
    getFrontCLients(0, 10)
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('')
    setCurrentPage(0)
    getFrontCLients(0, 10, { search: '', status: '' })
  }

  const exportRows = (rows) => {
    if (!rows.length) {
      Swal.fire('No data', 'There is nothing to download.', 'info')
      return
    }
    const sheetData = rows.map((r) => ({
      'Client ID': r.frontClientId,
      Name: r.name,
      'Contact Person': r.contactName,
      'Contact Number': r.contactNumber,
      'Contact Email': r.contactEmail,
      'GST Number': r.gstNumber,
      'PAN Number': r.panNumber,
      Address: r.address,
      City: r.city,
      State: r.state,
      Country: r.country,
      Pincode: r.pinCode,
      Status: r.status ? 'Active' : 'Deactive',
      'Create Date': r.createDate ? new Date(r.createDate).toLocaleString() : '',
    }))
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(sheetData)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Front Clients')
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const excelData = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const downloadLink = document.createElement('a')
    downloadLink.href = URL.createObjectURL(excelData)
    downloadLink.download = 'Front Clients.xlsx'
    downloadLink.click()
  }

  const downloadExcel = async () => {
    if (selectedRows.length > 0) {
      const rows = (frontClientsList.content || []).filter((r) => selectedRows.includes(r.id))
      exportRows(rows)
      return
    }

    setDownloading(true)
    try {
      var myHeaders = new Headers()
      myHeaders.append('X-Tenant', '' + tenant + '')
      myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
      const response = await fetch(apiUrl + '/auth/front-client/get-all-list?status=all', {
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

  const formik = useFormik({
    initialValues: {
      name: '',
      contactName: '',
      contactNumber: '',
      contactEmail: '',
      gstNumber: '',
      panNumber: '',
      address: '',
      pinCode: '',
      city: '',
      state: '',
      country: '',
      userId: details?.id,
      status: true,
      salesIds: [],
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .max(100, 'Must be 100 characters or less')
        .required('Required')
        .matches(/^[a-z\d\-_\s]+$/i, 'Only characters and numbers are allowed')
        .test('no-special-characters', 'Special characters are not allowed', (value) => {
          return /^[a-zA-Z0-9\s]*$/.test(value)
        })
        .test('validate-api-value', 'Front Client with same name already exist', validateUserName),
      contactName: Yup.string().max(100, 'Must be 100 characters or less').required('Required'),
      contactNumber: Yup.string()
        .min(10, 'Must be 10 characters')
        .max(11, 'Must not be more than 11 characters')
        .required('Required')
        .matches(/^[0-9]+$/, 'Invalid input. Only numbers are allowed.'),
      contactEmail: Yup.string().email('Invalid email address').required('Required'),
      gstNumber: Yup.string().matches(
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
        'Please enter a valid GST Number',
      ),
      panNumber: Yup.string().matches(
        /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
        'Please enter a valid PAN Number',
      ),
      status: Yup.boolean()
        .oneOf([true, false], 'Invalid input. Please select a value.')
        .required('Status is required'),
      address: Yup.string().max(200, 'Cant be more than 200 characters'),
      country: Yup.string().required(),
      pinCode: Yup.string()
        .min(6, 'Minimum 6 charecters required')
        .max(7, 'Cant be more than 7 charecters')
        .required(),
      city: Yup.string().required(),
      state: Yup.string().required(),
    }),
    onSubmit: (values) => {
      createFrontClient(values, router)
    },
  })

  useEffect(() => {
    getFrontCLients(0, 10)
    getSalesList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Front Clients</h1>
          <p className={styles.pageSubtitle}>
            Manage front-facing client accounts
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
                      frontClientsList.content?.length > 0 &&
                      selectedRows.length === frontClientsList.content?.length
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRows(frontClientsList.content?.map((option) => option.id) || [])
                      } else {
                        setSelectedRows([])
                      }
                    }}
                  />
                </th>
                <th>#</th>
                <th>Name</th>
                <th>Client ID</th>
                <th>Contact Person</th>
                <th>Contact Number</th>
                <th>Contact Email</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {frontClientsList.content?.map((option, index) => (
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
                  <td>{frontClientsList.number * frontClientsList.size + index}</td>
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
                  <td className={styles.email}>{option.frontClientId}</td>
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
                      onClick={() => editFrontClient(option.id)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {frontClientsList.content?.length === 0 && (
            <div className={styles.emptyState}>No front clients found</div>
          )}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={frontClientsList.totalPages}
          onPageChange={gotToPage}
          styles={styles}
        />
      </div>

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Create Front Client</h2>
              <button type="button" className={styles.modalClose} onClick={() => setShowModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={formik.handleSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
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
                    <label className={styles.formLabel}>GST Number</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      name="gstNumber"
                      placeholder="XX-YYYYYZZZZZ-Q-X-CC"
                      value={formik.values.gstNumber}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched.gstNumber && formik.errors.gstNumber && (
                      <span className={styles.formFeedbackInvalid}>{formik.errors.gstNumber}</span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>PAN Number</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      name="panNumber"
                      placeholder="ABCDE1234F"
                      value={formik.values.panNumber}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched.panNumber && formik.errors.panNumber && (
                      <span className={styles.formFeedbackInvalid}>{formik.errors.panNumber}</span>
                    )}
                  </div>
                  <div className={`${styles.formField} ${styles.full}`}>
                    <label className={styles.formLabel}>Address</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      name="address"
                      value={formik.values.address}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched.address && formik.errors.address && (
                      <span className={styles.formFeedbackInvalid}>{formik.errors.address}</span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Country</label>
                    <select
                      className={styles.filterSelect}
                      name="country"
                      value={formik.values.country}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    >
                      <option value="">Select</option>
                      <option value="India">India</option>
                    </select>
                    {formik.touched.country && formik.errors.country && (
                      <span className={styles.formFeedbackInvalid}>{formik.errors.country}</span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Pincode</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      name="pinCode"
                      value={formik.values.pinCode}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched.pinCode && formik.errors.pinCode && (
                      <span className={styles.formFeedbackInvalid}>{formik.errors.pinCode}</span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>City</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      name="city"
                      value={formik.values.city}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched.city && formik.errors.city && (
                      <span className={styles.formFeedbackInvalid}>{formik.errors.city}</span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>State</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      name="state"
                      value={formik.values.state}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched.state && formik.errors.state && (
                      <span className={styles.formFeedbackInvalid}>{formik.errors.state}</span>
                    )}
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
        <EditFrontClientModal
          clientId={editId}
          router={router}
          salesList={salesList}
          onClose={() => setEditId(null)}
          onSaved={() => getFrontCLients(currentPage, 10)}
        />
      )}
    </div>
  )
}

export default Create_Client
