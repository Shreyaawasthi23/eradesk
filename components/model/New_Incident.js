import { useFormik } from 'formik'
import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { createIncident } from '@/api/incident_api'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import * as Yup from 'yup'
import Lottie from 'react-lottie'
import loader from '@/assets/lottie/loading.json'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import moment from 'moment'
import Swal from 'sweetalert2'
import CappedSelect from '@/components/ui/CappedSelect'

import styles from './newIncident.module.scss'

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

// eslint-disable-next-line react/prop-types
const New_Incident = ({ visible, setVisible, ...props }) => {
  const details = getUserDetails()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const [assetDetails, setAssetDetails] = useState(null)
  const [assetText, setAssetText] = useState('')
  const [engineer, setEngineers] = useState([])

  const formatDate = (date) => {
    return moment(date).format('DD/MM/YYYY')
  }
  const handleDateChange = (e, formik) => {
    const inputValue = e.target.value
    const selectedDate = inputValue ? new Date(inputValue) : new Date()
    const javaUtilDate = new Date(selectedDate.getTime())
    formik.setFieldValue('incidentDate', javaUtilDate)
  }
  const handelValidityAsset = (assetText) => {
    switch (assetText) {
      case 'true':
        return (
          <span className={styles.validityValid}>
            {formatDate(assetDetails.assets.endDate)} Valid
          </span>
        )
      case 'false':
        return (
          <span className={styles.validityExpired}>
            {formatDate(assetDetails.assets.endDate)} Expired
          </span>
        )
      case 'Pre':
        return (
          <span className={styles.validityPre}>
            {formatDate(assetDetails.assets.endDate)} Pre-Valid
          </span>
        )
      default:
        return null
    }
  }
  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: loader,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice',
    },
  }
  const getAssetDetails = async (serialNo, formik) => {
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
      const response = await fetch(
        apiUrl + '/auth/core/assets/get-asset-details?serialNo=' + serialNo,
        requestOptions,
      )
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          if (data.assets.replaced) {
            setIsLoading(false)
            Swal.fire({
              title: 'Asset Expired',
              text: 'This asset is replace by Serial No. ' + data.assets.replacedSerial,
              icon: 'warning',
              confirmButtonColor: '#3085d6',
              confirmButtonText: 'Ok',
            }).then((result) => {
              if (result.isConfirmed) {
                setVisible(false)
              } else {
                setVisible(false)
              }
            })
          } else {
            getEnginners()
            formik.setFieldValue('serialNumber', serialNo)
            formik.setFieldValue('make', data.assets.make ? data.assets.make : ' ')
            formik.setFieldValue('model', data.assets.model ? data.assets.model : ' ')
            formik.setFieldValue(
              'contactName',
              data.assets.contactName ? data.assets.contactName : ' ',
            )
            formik.setFieldValue('pinCode', data.assets.pinCode ? data.assets.pinCode : ' ')
            formik.setFieldValue('city', data.assets.city ? data.assets.city : ' ')
            formik.setFieldValue('state', data.assets.state ? data.assets.state : ' ')
            formik.setFieldValue('fullAddress', data.assets.address ? data.assets.address : ' ')
            formik.setFieldValue('sla', data.assets.sla ? data.assets.sla : ' ')
            formik.setFieldValue('assetType', data.assets.assetType ? data.assets.assetType : ' ')
            setAssetDetails(data)
            setIsLoading(false)
            const currentDate = new Date()
            const targetDate = new Date(data.assets.endDate)
            const startDate = new Date(data.assets.startDate)
            if (startDate > currentDate) {
              setAssetText('Pre')
              Swal.fire('Oops!', 'This asset is in Pre-AMC condition', 'warning')
            } else if (targetDate > currentDate) {
              setAssetText('true')
            } else {
              setAssetText('false')
              Swal.fire({
                title: 'Warning',
                text: 'This asset is expired! Still want to continue?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes',
                cancelButtonText: 'No',
              }).then((result) => {
                if (result.isConfirmed) {
                } else {
                  formik.setFieldValue('serialNumber', ' ')
                  formik.setFieldValue('make', ' ')
                  formik.setFieldValue('model', ' ')
                  formik.setFieldValue('contactName', ' ')
                  formik.setFieldValue('pinCode', ' ')
                  formik.setFieldValue('city', ' ')
                  formik.setFieldValue('state', ' ')
                  formik.setFieldValue('fullAddress', ' ')
                  formik.setFieldValue('sla', ' ')
                  formik.setFieldValue('assetType', ' ')
                  setAssetDetails(null)
                  setIsLoading(false)
                  setVisible(false)
                }
              })
            }
          }
        } else {
          console.log('i am at else part')
        }
      }
    } catch (error) {
      formik.setFieldValue('serialNumber', serialNo)
      formik.setFieldValue('make', ' ')
      formik.setFieldValue('model', ' ')
      formik.setFieldValue('contactName', ' ')
      formik.setFieldValue('pinCode', ' ')
      formik.setFieldValue('city', ' ')
      formik.setFieldValue('state', ' ')
      formik.setFieldValue('fullAddress', ' ')
      formik.setFieldValue('sla', ' ')
      formik.setFieldValue('assetType', ' ')
      setAssetDetails(null)
      setIsLoading(false)
    }
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
      const response = await fetch(apiUrl + '/api/auth/core/users/get-engineers', requestOptions)
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
  const formik = useFormik({
    initialValues: {
      incidentDate: new Date().toISOString(),
      serialNumber: '',
      problem: '',
      make: '',
      model: '',
      priority: 3,
      assetType: '',
      engineerId: '',
      poType: '',
      contactName: '',
      contactEmail: '',
      contactNumber: '',
      sla: '',
      userId: details?.id,
      state: '',
      city: '',
      pinCode: '',
      fullAddress: '',
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
        .max(100, 'Must be 100 characters or less')
        .required('Required'),
      contactNumber: Yup.string()
        .min(10, 'Must be 10 characters')
        .max(25, 'Must not be more than 25 characters')
        .required('Required'),
      contactEmail: Yup.string().email('Invalid email address').required('Required'),
      pinCode: Yup.string()
        .min(5, 'Must be 5 characters or more')
        .max(6, 'Must be 6 characters or less')
        .required('Required'),
      state: Yup.string().required('Required'),
      city: Yup.string().required('Required'),
      fullAddress: Yup.string()
        .min(10, 'Must be 10 characters')
        .max(500, 'Must be 500 characters or less')
        .required('Required'),
      sla: Yup.string().max(50, 'Must be 50 characters or less').required('Required'),
    }),
    onSubmit: (values, { resetForm }) => {
      createIncident(values, router, setVisible, resetForm, setIsLoading)
    },
  })

  if (!visible) return null

  return (
    <div className={styles.modalOverlay}>
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
            onClick={() => setIsLoading(false)}
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
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Raise Incident</h2>
          <button type="button" className={styles.modalClose} onClick={() => setVisible(false)}>
            &times;
          </button>
        </div>
        <form onSubmit={formik.handleSubmit}>
          <div className={styles.modalBody}>
            {assetDetails && (
              <div className={styles.assetBanner}>
                <div className={styles.assetBannerField}>
                  <span className={styles.assetBannerLabel}>Front Client</span>
                  <span className={styles.assetBannerValue}>{assetDetails.frontClient}</span>
                </div>
                <div className={styles.assetBannerField}>
                  <span className={styles.assetBannerLabel}>End Client</span>
                  <span className={styles.assetBannerValue}>{assetDetails.endClient}</span>
                </div>
                <div className={styles.assetBannerField}>
                  <span className={styles.assetBannerLabel}>Asset Expiry</span>
                  <span className={styles.assetBannerValue}>{handelValidityAsset(assetText)}</span>
                </div>
              </div>
            )}

            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Serial No.</label>
                <input
                  type="text"
                  className={styles.formInput}
                  name="serialNumber"
                  onChange={(e) => getAssetDetails(e.target.value, formik)}
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
                  name="incidentDate"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => handleDateChange(e, formik)}
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
                <label className={styles.formLabel}>Priority</label>
                <CappedSelect
                  value={formik.values.priority}
                  onChange={(e) => formik.setFieldValue('priority', e.target.value)}
                  onBlur={formik.handleBlur}
                  options={priorityOptions}
                />
                {formik.touched.priority && formik.errors.priority && (
                  <span className={styles.formFeedbackInvalid}>{formik.errors.priority}</span>
                )}
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Problem</label>
                <textarea
                  className={styles.formInput}
                  rows={3}
                  name="problem"
                  value={formik.values.problem}
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
                  value={formik.values.assetType}
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
                  value={formik.values.engineerId}
                  onChange={(e) => formik.setFieldValue('engineerId', e.target.value)}
                  onBlur={formik.handleBlur}
                  options={engineer?.map((element) => ({
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
                  value={formik.values.contactName}
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
                  value={formik.values.contactEmail}
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
                  value={formik.values.contactNumber}
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
                <label className={styles.formLabel}>Address</label>
                <input
                  type="text"
                  className={styles.formInput}
                  name="fullAddress"
                  value={formik.values.fullAddress}
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
                  value={formik.values.sla}
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
            <button type="button" className={styles.cancelBtn} onClick={() => setVisible(false)}>
              Close
            </button>
            <button type="submit" className={styles.submitBtn}>
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default New_Incident
