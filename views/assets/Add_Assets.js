import { useFormik } from 'formik'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import * as Yup from 'yup'
import { AddAssets } from '@/api/assets_api'
import Add_Replacement from '@/components/model/Add_Replacement'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import CappedSelect from '@/components/ui/CappedSelect'
import Pagination from '@/components/ui/Pagination'

import styles from './assets.module.scss'
import DownloadFormatModal from './DownloadFormatModal'
import UploadAssetsModal from './UploadAssetsModal'
import EditAssetModal from './EditAssetModal'

const assetTypeOptions = [
  'Server',
  'Storage',
  'Network',
  'Security',
  'Desktop',
  'Printer',
  'Peripheral',
  'VC',
  'Load Balancer',
  'Others',
]

const Add_Assets = () => {
  const details = getUserDetails()
  const router = useRouter()
  const [assetList, setAssetList] = useState({})
  const [endClientList, setEndClientList] = useState([])
  const [currentPage, setCurrentPage] = useState(0)
  const [poList, setPoList] = useState([])

  const [showModal, setShowModal] = useState(false)
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editId, setEditId] = useState(null)

  const [visibilityReplacement, setVisibilityReplacement] = useState(false)
  const [assetDetails, setAssetDetails] = useState({})

  // Filters
  const [search, setSearch] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [serialNo, setSerialNo] = useState('')

  const buildFilterQuery = (filters) => {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.poNumber) params.set('poNumber', filters.poNumber)
    if (filters.serialNo) params.set('serialNo', filters.serialNo)
    return params.toString()
  }

  const handleDateChange = (e, formik) => {
    const inputValue = e.target.value
    const jsDate = new Date(inputValue)
    formik.setFieldValue(e.target.name, jsDate)
  }

  const handelPinCode = (e, formik) => {
    const value = e.target.value
    formik.setFieldValue('pinCode', value)
    if (value.length >= 5) {
      var myHeaders = new Headers()
      myHeaders.append('X-Tenant', '' + tenant + '')
      myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

      var requestOptions = {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      }

      fetch(apiUrl + '/auth/purchase/get-state-city?pincode=' + value, requestOptions)
        .then((response) => (response.status === 401 ? router.push('/') : response.json()))
        .then((result) => {
          if (result !== null) {
            formik.setFieldValue('state', result.state)
            formik.setFieldValue('city', result.city)
          }
        })
        .catch((error) => console.log('error', error))
    }
  }

  const getAllEndClients = () => {
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

  const getAssetList = async (
    page,
    size,
    filters = { search, poNumber, serialNo },
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
      '/auth/assets/get-all-page?page=' +
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
          setAssetList(data)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const applyFilters = () => {
    setCurrentPage(0)
    getAssetList(0, 10)
  }

  const clearFilters = () => {
    setSearch('')
    setPoNumber('')
    setSerialNo('')
    setCurrentPage(0)
    getAssetList(0, 10, { search: '', poNumber: '', serialNo: '' })
  }

  const gotToPage = (pageNo) => {
    getAssetList(pageNo, 10)
    setCurrentPage(pageNo)
  }

  const editAsset = (id) => {
    setEditId(id)
  }

  const openAddReplacement = (item) => {
    setVisibilityReplacement(true)
    setAssetDetails(item)
  }

  const handelEndClientSelect = (e, formik) => {
    formik.setFieldValue('endClientId', e.target.value)
    formik.setFieldValue('purchaseOrderNumber', '')
    getPOByEndClient(e.target.value)
  }

  const getPOByEndClient = async (value) => {
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
        apiUrl + '/auth/purchase/by-end-client?endClientId=' + value,
        requestOptions,
      )
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setPoList(data)
        }
      }
    } catch (error) {
      // ignore
    }
  }

  const formik = useFormik({
    initialValues: {
      make: '',
      model: '',
      serialNumber: '',
      purchaseOrderNumber: '',
      startDate: '',
      endDate: '',
      sla: '',
      assetType: '',
      pinCode: '',
      city: '',
      state: '',
      address: '',
      endClientId: '',
      userId: details?.id,
    },
    validationSchema: Yup.object({
      make: Yup.string().max(25, 'Must be 25 characters or less').required('Required'),
      model: Yup.string().max(25, 'Must be 25 characters or less').required('Required'),
      serialNumber: Yup.string()
        .min(5, 'Must be 5 characters')
        .max(40, 'Must not be more than 40 characters')
        .required('Required'),
      purchaseOrderNumber: Yup.string().required('Required'),
      startDate: Yup.string().required('Required'),
      endDate: Yup.string().required('Required'),
      sla: Yup.string().required('Required'),
      assetType: Yup.string().required('Required'),
      pinCode: Yup.string().required('Required'),
      city: Yup.string().required('Required'),
      state: Yup.string().required('Required'),
      address: Yup.string().required('Required'),
      endClientId: Yup.string().required('Required'),
      userId: Yup.string().required('Required'),
    }),
    onSubmit: (values) => {
      AddAssets(values, router, () => {
        setShowModal(false)
        formik.resetForm()
        getAssetList(currentPage, 10)
      })
    },
  })

  useEffect(() => {
    getAllEndClients()
    getAssetList(0, 10)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Add Assets</h1>
          <p className={styles.pageSubtitle}>Manage and add assets</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className={styles.filterClear} onClick={() => setShowDownloadModal(true)}>
            Download Template
          </button>
          <button type="button" className={styles.filterClear} onClick={() => setShowUploadModal(true)}>
            Upload Excel
          </button>
          <button type="button" className={styles.addBtn} onClick={() => setShowModal(true)}>
            + Add New Asset
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.filterBar}>
          <div className={styles.filterFieldWide}>
            <label className={styles.filterLabel}>Search</label>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="Make or model"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>PO Number</label>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="PO number"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Serial Number</label>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="Serial number"
              value={serialNo}
              onChange={(e) => setSerialNo(e.target.value)}
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
                <th>Serial Number</th>
                <th>Make</th>
                <th>Model</th>
                <th>PO</th>
                <th>Create Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {assetList.content?.map((option, index) => (
                <tr key={option.id}>
                  <td>{assetList.number * assetList.size + index}</td>
                  <td className={styles.username}>{option.serialNumber}</td>
                  <td className={styles.email}>{option.make}</td>
                  <td className={styles.email}>{option.model}</td>
                  <td className={styles.email}>{option.purchaseOrderNumber}</td>
                  <td className={styles.email}>{option.createDate}</td>
                  <td>
                    <button type="button" className={styles.editBtn} onClick={() => editAsset(option.id)}>
                      Edit
                    </button>{' '}
                    <button
                      type="button"
                      className={styles.editBtn}
                      onClick={() => openAddReplacement(option)}
                    >
                      Replace
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {assetList.content?.length === 0 && (
            <div className={styles.emptyState}>No assets found</div>
          )}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={assetList.totalPages}
          onPageChange={gotToPage}
          styles={styles}
        />
      </div>

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Add New Asset</h2>
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
                      onChange={(e) => handelEndClientSelect(e, formik)}
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
                    <CappedSelect
                      name="purchaseOrderNumber"
                      value={formik.values.purchaseOrderNumber}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      options={poList?.map((element) => ({
                        value: element.purchaseOrderNumber,
                        label: element.purchaseOrderNumber,
                      }))}
                    />
                    {formik.touched.purchaseOrderNumber && formik.errors.purchaseOrderNumber && (
                      <span className={styles.formFeedbackInvalid}>
                        {formik.errors.purchaseOrderNumber}
                      </span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Make</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      name="make"
                      value={formik.values.make}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched.make && formik.errors.make && (
                      <span className={styles.formFeedbackInvalid}>{formik.errors.make}</span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Model</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      name="model"
                      value={formik.values.model}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched.model && formik.errors.model && (
                      <span className={styles.formFeedbackInvalid}>{formik.errors.model}</span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Serial Number</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      name="serialNumber"
                      value={formik.values.serialNumber}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched.serialNumber && formik.errors.serialNumber && (
                      <span className={styles.formFeedbackInvalid}>{formik.errors.serialNumber}</span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Asset Type</label>
                    <CappedSelect
                      name="assetType"
                      value={formik.values.assetType}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      options={assetTypeOptions.map((t) => ({ value: t, label: t }))}
                    />
                    {formik.touched.assetType && formik.errors.assetType && (
                      <span className={styles.formFeedbackInvalid}>{formik.errors.assetType}</span>
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
                    <label className={styles.formLabel}>SLA</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      name="sla"
                      value={formik.values.sla}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched.sla && formik.errors.sla && (
                      <span className={styles.formFeedbackInvalid}>{formik.errors.sla}</span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Pincode</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      name="pinCode"
                      value={formik.values.pinCode}
                      onChange={(e) => handelPinCode(e, formik)}
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

      {showDownloadModal && (
        <DownloadFormatModal onClose={() => setShowDownloadModal(false)} />
      )}

      {showUploadModal && (
        <UploadAssetsModal
          onClose={() => setShowUploadModal(false)}
          onUploaded={() => getAssetList(currentPage, 10)}
        />
      )}

      {editId && (
        <EditAssetModal
          assetId={editId}
          router={router}
          endClientList={endClientList}
          onClose={() => setEditId(null)}
          onSaved={() => getAssetList(currentPage, 10)}
        />
      )}

      <Add_Replacement
        visible={visibilityReplacement}
        setVisible={setVisibilityReplacement}
        asset={assetDetails}
        assetList={getAssetList}
      />
    </div>
  )
}

export default Add_Assets
