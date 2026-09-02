import React, { useEffect, useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import moment from 'moment'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { editIncident } from '@/apiClients/incident_api'
import CappedSelect from '@/components/ui/CappedSelect'

import styles from './incident.module.scss'

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
  'RESOLVED',
  'SPARE IN TRANSIT',
  'UNDER OBSERVATION',
  'WORK IN PROGRESS',
]

const priorityOptions = [
  { value: 1, label: 'P1' },
  { value: 2, label: 'P2' },
  { value: 3, label: 'P3' },
  { value: 4, label: 'P4' },
  { value: 5, label: 'P5' },
]

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

const toDateInput = (date) => (date ? moment(date).format('YYYY-MM-DD') : '')

const EditIncidentModal = ({ incidentId, router, engineerList, onClose, onSaved }) => {
  const details = getUserDetails()
  const [incidentDetails, setIncidentDetails] = useState({})
  const [loading, setLoading] = useState(true)

  const getIncidentDetails = async () => {
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
        apiUrl + '/auth/core/incident/get-detail?id=' + incidentId,
        requestOptions,
      )
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        setIncidentDetails(data || {})
        setLoading(false)
      }
    } catch (error) {
      setLoading(false)
    }
  }

  const handleDateChange = (e, formik) => {
    const inputValue = e.target.value
    const jsDate = new Date(inputValue)
    formik.setFieldValue('incidentDate', jsDate.toISOString())
  }

  const getAssetDetails = (e, formik) => {
    const serialNo = e.target.value
    formik.setFieldValue('serialNumber', serialNo)
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    fetch(apiUrl + '/auth/core/assets/get-asset-details?serialNo=' + serialNo, requestOptions)
      .then((response) => (response.status === 401 ? router.push('/') : response.json()))
      .then((result) => {
        if (!result) return
        formik.setFieldValue('make', result.make || '')
        formik.setFieldValue('model', result.model || '')
        formik.setFieldValue('contactName', result.contactName || '')
        formik.setFieldValue('pinCode', result.pinCode || '')
        formik.setFieldValue('city', result.city || '')
        formik.setFieldValue('state', result.state || '')
        formik.setFieldValue('fullAddress', result.fullAddress || '')
      })
      .catch((error) => console.log('error', error))
  }

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      incidentDate: toDateInput(incidentDetails.incidentDate),
      serialNumber: incidentDetails.serialNumber,
      problem: incidentDetails.problem,
      make: incidentDetails.make,
      model: incidentDetails.model,
      priority: incidentDetails.priority,
      assetType: incidentDetails.assetType,
      engineerId: incidentDetails.engineerId,
      poType: incidentDetails.poType,
      contactName: incidentDetails.contactName,
      contactEmail: incidentDetails.contactEmail,
      contactNumber: incidentDetails.contactNumber,
      sla: incidentDetails.sla,
      userId: details?.id,
      state: incidentDetails.state,
      city: incidentDetails.city,
      pinCode: incidentDetails.pinCode,
      fullAddress: incidentDetails.fullAddress,
      status: incidentDetails.status,
      id: incidentDetails.id,
    },
    validationSchema: Yup.object({
      incidentDate: Yup.date().required('Required'),
      serialNumber: Yup.string().max(25, 'Must be 25 characters or less').required('Required'),
      problem: Yup.string().min(10, 'Must be 10 characters').required('Required'),
      make: Yup.string().max(50, 'Must be 50 characters or less').required('Required'),
      model: Yup.string().max(50, 'Must be 50 characters or less').required('Required'),
      priority: Yup.number().required('Required'),
      assetType: Yup.string().required('Required'),
      engineerId: Yup.string().required('Required'),
      contactName: Yup.string()
        .min(5, 'Must be 5 characters')
        .max(30, 'Must be 30 characters or less')
        .required('Required'),
      contactNumber: Yup.string()
        .min(10, 'Must be 10 characters')
        .max(25, 'Must not be more than 50 characters')
        .required('Required')
        .matches(/^[0-9]+$/, 'Invalid input. Only numbers are allowed.'),
      contactEmail: Yup.string().email('Invalid email address').required('Required'),
      pinCode: Yup.string()
        .min(5, 'Must be 5 characters or more')
        .max(6, 'Must be 6 characters or less')
        .required('Required'),
      state: Yup.string().required('Required'),
      city: Yup.string().required('Required'),
      fullAddress: Yup.string().max(500, 'Must be 500 characters or less').required('Required'),
      sla: Yup.string().max(100, 'Must be 100 characters or less').required('Required'),
    }),
    onSubmit: (values) => {
      editIncident(values, router, () => {
        onSaved()
        onClose()
      })
    },
  })

  useEffect(() => {
    if (!incidentId) return
    getIncidentDetails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentId])

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Edit Incident #{incidentDetails.incidentId}</h2>
          <button type="button" className={styles.modalClose} onClick={onClose}>
            &times;
          </button>
        </div>
        {loading ? (
          <div className={styles.modalBody}>Loading...</div>
        ) : (
          <form onSubmit={formik.handleSubmit}>
            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Status</label>
                  <CappedSelect
                    value={formik.values.status || ''}
                    onChange={(e) => formik.setFieldValue('status', e.target.value)}
                    onBlur={formik.handleBlur}
                    options={statusOptions.map((s) => ({ value: s, label: s }))}
                  />
                  {formik.touched.status && formik.errors.status && (
                    <span className={styles.formFeedbackInvalid}>{formik.errors.status}</span>
                  )}
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Serial No.</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formik.values.serialNumber || ''}
                    onChange={(e) => getAssetDetails(e, formik)}
                    onBlur={formik.handleBlur}
                  />
                  {formik.touched.serialNumber && formik.errors.serialNumber && (
                    <span className={styles.formFeedbackInvalid}>{formik.errors.serialNumber}</span>
                  )}
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Date</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={formik.values.incidentDate || ''}
                    onChange={(e) => handleDateChange(e, formik)}
                    onBlur={formik.handleBlur}
                  />
                  {formik.touched.incidentDate && formik.errors.incidentDate && (
                    <span className={styles.formFeedbackInvalid}>{formik.errors.incidentDate}</span>
                  )}
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Make</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    name="make"
                    value={formik.values.make || ''}
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
                    value={formik.values.model || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                  {formik.touched.model && formik.errors.model && (
                    <span className={styles.formFeedbackInvalid}>{formik.errors.model}</span>
                  )}
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Priority</label>
                  <CappedSelect
                    value={formik.values.priority ?? ''}
                    onChange={(e) => formik.setFieldValue('priority', e.target.value)}
                    onBlur={formik.handleBlur}
                    options={priorityOptions}
                  />
                  {formik.touched.priority && formik.errors.priority && (
                    <span className={styles.formFeedbackInvalid}>{formik.errors.priority}</span>
                  )}
                </div>
                <div className={`${styles.formField} ${styles.full}`}>
                  <label className={styles.formLabel}>Problem</label>
                  <textarea
                    className={styles.formInput}
                    rows={3}
                    name="problem"
                    value={formik.values.problem || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                  {formik.touched.problem && formik.errors.problem && (
                    <span className={styles.formFeedbackInvalid}>{formik.errors.problem}</span>
                  )}
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Asset Type</label>
                  <CappedSelect
                    value={formik.values.assetType || ''}
                    onChange={(e) => formik.setFieldValue('assetType', e.target.value)}
                    onBlur={formik.handleBlur}
                    options={assetTypeOptions.map((t) => ({ value: t, label: t }))}
                  />
                  {formik.touched.assetType && formik.errors.assetType && (
                    <span className={styles.formFeedbackInvalid}>{formik.errors.assetType}</span>
                  )}
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Engineer</label>
                  <CappedSelect
                    value={formik.values.engineerId || ''}
                    onChange={(e) => formik.setFieldValue('engineerId', e.target.value)}
                    onBlur={formik.handleBlur}
                    options={engineerList?.map((element) => ({
                      value: element.id,
                      label: `${element.firstName} ${element.lastName}`,
                    }))}
                  />
                  {formik.touched.engineerId && formik.errors.engineerId && (
                    <span className={styles.formFeedbackInvalid}>{formik.errors.engineerId}</span>
                  )}
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Contact Name</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    name="contactName"
                    value={formik.values.contactName || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                  {formik.touched.contactName && formik.errors.contactName && (
                    <span className={styles.formFeedbackInvalid}>{formik.errors.contactName}</span>
                  )}
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Contact Email</label>
                  <input
                    type="email"
                    className={styles.formInput}
                    name="contactEmail"
                    value={formik.values.contactEmail || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                  {formik.touched.contactEmail && formik.errors.contactEmail && (
                    <span className={styles.formFeedbackInvalid}>{formik.errors.contactEmail}</span>
                  )}
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Contact Number</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    name="contactNumber"
                    value={formik.values.contactNumber || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                  {formik.touched.contactNumber && formik.errors.contactNumber && (
                    <span className={styles.formFeedbackInvalid}>{formik.errors.contactNumber}</span>
                  )}
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Pincode</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    name="pinCode"
                    value={formik.values.pinCode || ''}
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
                    value={formik.values.city || ''}
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
                    value={formik.values.state || ''}
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
                    name="fullAddress"
                    value={formik.values.fullAddress || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                  {formik.touched.fullAddress && formik.errors.fullAddress && (
                    <span className={styles.formFeedbackInvalid}>{formik.errors.fullAddress}</span>
                  )}
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>SLA</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    name="sla"
                    value={formik.values.sla || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                  {formik.touched.sla && formik.errors.sla && (
                    <span className={styles.formFeedbackInvalid}>{formik.errors.sla}</span>
                  )}
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={styles.submitBtn}>
                Save Changes
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default EditIncidentModal
