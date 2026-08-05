import { useFormik } from 'formik'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Swal from 'sweetalert2'
import * as Yup from 'yup'
import moment from 'moment'
import { createPurchase } from '@/api/purchase_api'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import CappedSelect from '@/components/ui/CappedSelect'
import Pagination from '@/components/ui/Pagination'

import styles from './purchase.module.scss'
import EditPurchaseModal from './EditPurchaseModal'

const poTypeOptions = [
  'AMC (B2B)',
  'AMC (Skill)',
  'AMC (Spare)',
  'CAMC',
  'One Time Support',
  'Rental Service',
  'FMS',
  'Installation',
  'License',
  'Software',
  'Product',
]

const PurchaseOrders = () => {
  const details = getUserDetails()
  const router = useRouter()
  const [endClientList, setEndClientList] = useState([])
  const [salesList, setSalesList] = useState([])
  const [purchaseList, setPurchaseList] = useState({})
  const [currentPage, setCurrentPage] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [endClientFilter, setEndClientFilter] = useState('')

  const buildFilterQuery = (filters) => {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.status) params.set('status', filters.status)
    if (filters.endClientId) params.set('endClientId', filters.endClientId)
    return params.toString()
  }

  const formatDate = (date) => (date ? moment(date).format('DD/MM/YYYY') : '')

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

  const getPurchaseList = async (
    page,
    size,
    filters = { search, status: statusFilter, endClientId: endClientFilter },
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

  const gotToPage = (pageNo) => {
    getPurchaseList(pageNo, 10)
    setCurrentPage(pageNo)
  }

  const editPurchaseHandler = (id) => {
    setEditId(id)
  }

  const applyFilters = () => {
    setCurrentPage(0)
    getPurchaseList(0, 10)
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('')
    setEndClientFilter('')
    setCurrentPage(0)
    getPurchaseList(0, 10, { search: '', status: '', endClientId: '' })
  }

  const expirePo = async (poNumber) => {
    Swal.fire({
      icon: 'warning',
      title: 'Are you sure you want to expire PO ?',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: 'Expire',
      denyButtonText: 'Cancel',
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
      } else if (result.isDenied) {
        Swal.fire('Expiration Cancled', '', 'info')
      }
    })
  }

  const handleDateChange = (e, formik) => {
    const inputValue = e.target.value
    const jsDate = new Date(inputValue)
    formik.setFieldValue(e.target.name, jsDate)
  }

  const formik = useFormik({
    initialValues: {
      endClientId: '',
      purchaseOrderNumber: '',
      contactName: '',
      contactNumber: '',
      contactEmail: '',
      startDate: '',
      endDate: '',
      poReceiveDate: '',
      type: '',
      userId: details?.id,
      status: true,
      value: 0.0,
      salesId: '',
    },
    validationSchema: Yup.object({
      salesId: Yup.string().required('Required'),
      endClientId: Yup.string().required('Required'),
      purchaseOrderNumber: Yup.string().required('Required'),
      contactNumber: Yup.string()
        .min(10, 'Must be 10 characters')
        .max(11, 'Must not be more than 11 characters')
        .required('Required')
        .matches(/^[0-9]+$/, 'Invalid input. Only numbers are allowed.'),
      contactName: Yup.string().required('Required'),
      contactEmail: Yup.string().email('Invalid email address').required('Required'),
      startDate: Yup.string().required('Required'),
      endDate: Yup.string().required('Required'),
      poReceiveDate: Yup.string().required('Required'),
      type: Yup.string().required('Required'),
      status: Yup.boolean()
        .oneOf([true, false], 'Invalid input. Please select a value.')
        .required('Status is required'),
      value: Yup.number()
        .typeError('Order value must be a number')
        .positive('Order value must be positive')
        .required('Order value is required'),
    }),
    onSubmit: (values) => {
      createPurchase(values, router, () => {
        setShowModal(false)
        formik.resetForm()
        getPurchaseList(currentPage, 10)
      })
    },
  })

  useEffect(() => {
    getEndClientList()
    getSalesList()
    getPurchaseList(0, 10)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Purchase Orders</h1>
          <p className={styles.pageSubtitle}>Manage purchase orders</p>
        </div>
        <button type="button" className={styles.addBtn} onClick={() => setShowModal(true)}>
          + Add New PO
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.filterBar}>
          <div className={styles.filterFieldWide}>
            <label className={styles.filterLabel}>Search</label>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="PO number, contact, or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <div className={styles.filterFieldNarrow}>
            <label className={styles.filterLabel}>End Client</label>
            <select
              className={styles.filterSelectNarrow}
              value={endClientFilter}
              onChange={(e) => setEndClientFilter(e.target.value)}
            >
              <option value="">All</option>
              {endClientList?.map((element) => (
                <option key={element.id} value={element.id}>
                  {element.name}
                </option>
              ))}
            </select>
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
                <th>#</th>
                <th>PO Number</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>PO Received Date</th>
                <th>Type</th>
                <th>Value</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {purchaseList.content?.map((option, index) => (
                <tr key={option.id}>
                  <td>{purchaseList.number * purchaseList.size + index}</td>
                  <td className={styles.username}>{option.purchaseOrderNumber}</td>
                  <td className={styles.email}>{formatDate(option.startDate)}</td>
                  <td className={styles.email}>{formatDate(option.endDate)}</td>
                  <td className={styles.email}>{option.poReceiveDate}</td>
                  <td className={styles.email}>{option.type}</td>
                  <td className={styles.email}>INR {option.value}/-</td>
                  <td>
                    <span className={option.status ? styles.statusActive : styles.statusInactive}>
                      {option.status ? 'Active' : 'Deactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.editBtn}
                      onClick={() => editPurchaseHandler(option.id)}
                    >
                      Edit
                    </button>{' '}
                    {(details?.roles?.includes('ROLE_ADMIN') ||
                      details?.roles?.includes('ROLE_MODERATOR')) && (
                      <button
                        type="button"
                        className={styles.editBtn}
                        onClick={() => expirePo(option.purchaseOrderNumber)}
                      >
                        Expire
                      </button>
                    )}
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
          styles={styles}
        />
      </div>

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Create Purchase Order</h2>
              <button type="button" className={styles.modalClose} onClick={() => setShowModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={formik.handleSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>End Client</label>
                    <CappedSelect
                      name="endClientId"
                      value={formik.values.endClientId}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      options={endClientList?.map((element) => ({
                        value: element.id,
                        label: element.name,
                      }))}
                    />
                    {formik.touched.endClientId && formik.errors.endClientId && (
                      <span className={styles.formFeedbackInvalid}>{formik.errors.endClientId}</span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>PO Number</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      name="purchaseOrderNumber"
                      value={formik.values.purchaseOrderNumber}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched.purchaseOrderNumber && formik.errors.purchaseOrderNumber && (
                      <span className={styles.formFeedbackInvalid}>
                        {formik.errors.purchaseOrderNumber}
                      </span>
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
                    <label className={styles.formLabel}>Sales Person</label>
                    <CappedSelect
                      name="salesId"
                      value={formik.values.salesId}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      options={salesList?.map((element) => ({
                        value: element.id,
                        label: element.name,
                      }))}
                    />
                    {formik.touched.salesId && formik.errors.salesId && (
                      <span className={styles.formFeedbackInvalid}>{formik.errors.salesId}</span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Start Date</label>
                    <input
                      type="date"
                      className={styles.formInput}
                      name="startDate"
                      onChange={(e) => handleDateChange(e, formik)}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched.startDate && formik.errors.startDate && (
                      <span className={styles.formFeedbackInvalid}>{formik.errors.startDate}</span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>End Date</label>
                    <input
                      type="date"
                      className={styles.formInput}
                      name="endDate"
                      onChange={(e) => handleDateChange(e, formik)}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched.endDate && formik.errors.endDate && (
                      <span className={styles.formFeedbackInvalid}>{formik.errors.endDate}</span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>PO Receive Date</label>
                    <input
                      type="date"
                      className={styles.formInput}
                      name="poReceiveDate"
                      value={formik.values.poReceiveDate}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched.poReceiveDate && formik.errors.poReceiveDate && (
                      <span className={styles.formFeedbackInvalid}>{formik.errors.poReceiveDate}</span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>PO Type</label>
                    <CappedSelect
                      name="type"
                      value={formik.values.type}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      options={poTypeOptions.map((t) => ({ value: t, label: t }))}
                    />
                    {formik.touched.type && formik.errors.type && (
                      <span className={styles.formFeedbackInvalid}>{formik.errors.type}</span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>PO Value</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      name="value"
                      value={formik.values.value}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched.value && formik.errors.value && (
                      <span className={styles.formFeedbackInvalid}>{formik.errors.value}</span>
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

export default PurchaseOrders
