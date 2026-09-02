import { useFormik } from 'formik'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import * as Yup from 'yup'
import moment from 'moment'
import { CreateSalesParticipant } from '@/api/user_api'

import styles from './sales.module.scss'
import EditSalesModal from './EditSalesModal'
import Pagination from '@/components/ui/Pagination'

const avatarPalette = ['#2E86DE', '#22C58B', '#8E44AD', '#F4623A', '#17A2A8', '#D35400']
const initials = (name) => (name ? name.charAt(0).toUpperCase() : '?')

const Create_Sales = () => {
  const [currentPage, setCurrentPage] = useState(0)
  const details = getUserDetails()
  const router = useRouter()

  const [salesList, setSalesList] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const buildFilterQuery = (filters) => {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.status) params.set('status', filters.status)
    if (filters.startDate) params.set('startDate', filters.startDate)
    if (filters.endDate) params.set('endDate', filters.endDate)
    return params.toString()
  }

  const gotToPage = (pageNo) => {
    getSalesList(pageNo, 10)
    setCurrentPage(pageNo)
  }

  const getSalesList = async (page, size, filters = { search, status: statusFilter, startDate, endDate }) => {
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
      '/auth/core/sales-team/get-all?page=' +
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
          setSalesList(data)
        }
      }
    } catch (error) {
      console.log('error', error)
    }
  }

  const editSalesPerson = (id) => {
    setEditId(id)
  }

  const formatDate = (date) => {
    return moment(date).format('DD/MM/YYYY')
  }

  const applyFilters = () => {
    setCurrentPage(0)
    getSalesList(0, 10)
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('')
    setStartDate('')
    setEndDate('')
    setCurrentPage(0)
    getSalesList(0, 10, { search: '', status: '', startDate: '', endDate: '' })
  }

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: '',
      email: '',
      number: '',
      userId: details?.id,
      status: true,
    },
    validationSchema: Yup.object({
      name: Yup.string().required('Required'),
      userId: Yup.string().required('Required'),
      number: Yup.string()
        .min(10, 'Must be 10 characters')
        .max(11, 'Must not be more than 11 characters')
        .required('Required')
        .matches(/^[0-9]+$/, 'Invalid input. Only numbers are allowed.'),
      email: Yup.string().email('Invalid email address').required('Required'),
      status: Yup.boolean()
        .oneOf([true, false], 'Invalid input. Please select a value.')
        .required('Status is required'),
    }),
    onSubmit: (values, { resetForm }) => {
      CreateSalesParticipant(values, router, getSalesList)
      setShowModal(false)
      resetForm()
    },
  })

  useEffect(() => {
    getSalesList(0, 10)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Sales Team</h1>
          <p className={styles.pageSubtitle}>Manage sales participants</p>
        </div>
        <button type="button" className={styles.addBtn} onClick={() => setShowModal(true)}>
          + Add New Participant
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.filterBar}>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Search</label>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="Name or email"
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
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Created From</label>
            <input
              type="date"
              className={styles.filterInput}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Created To</label>
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

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Contact Number</th>
                <th>Create Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {salesList.content?.map((option, index) => (
                <tr key={option.id}>
                  <td>{salesList.number * salesList.size + index}</td>
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
                  <td className={styles.email}>{option.email}</td>
                  <td className={styles.email}>{option.number}</td>
                  <td className={styles.email}>{formatDate(option.createDate)}</td>
                  <td>
                    <span className={option.status !== false ? styles.statusActive : styles.statusInactive}>
                      {option.status !== false ? 'Active' : 'Deactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.editBtn}
                      onClick={() => editSalesPerson(option.id)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {salesList.content?.length === 0 && <div className={styles.emptyState}>No sales participants found</div>}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={salesList.totalPages}
          onPageChange={gotToPage}
          styles={styles}
        />
      </div>

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Add Sales Participant</h2>
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
                    <label className={styles.formLabel}>Email</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      name="email"
                      value={formik.values.email}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched.email && formik.errors.email && (
                      <span className={styles.formFeedbackInvalid}>{formik.errors.email}</span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Contact Number</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      name="number"
                      value={formik.values.number}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched.number && formik.errors.number && (
                      <span className={styles.formFeedbackInvalid}>{formik.errors.number}</span>
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
        <EditSalesModal
          salesId={editId}
          router={router}
          onClose={() => setEditId(null)}
          onSaved={() => getSalesList(currentPage, 10)}
        />
      )}
    </div>
  )
}

export default Create_Sales
