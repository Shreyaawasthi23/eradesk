import React, { useEffect, useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import moment from 'moment'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { EditAsset } from '@/apiClients/assets_api'
import CappedSelect from '@/components/ui/CappedSelect'

import styles from './assets.module.scss'

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

const EditAssetModal = ({ assetId, router, endClientList, onClose, onSaved }) => {
  const details = getUserDetails()
  const [assetDetails, setAssetDetails] = useState({})
  const [loading, setLoading] = useState(true)

  const getAssetDetails = () => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    fetch(apiUrl + '/auth/core/assets/detail?id=' + assetId, requestOptions)
      .then((response) => (response.status === 401 ? router.push('/') : response.json()))
      .then((result) => {
        setAssetDetails(result || {})
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  const handleDateChange = (e, formik) => {
    formik.setFieldValue(e.target.name, e.target.value)
  }

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      make: assetDetails.make,
      model: assetDetails.model,
      serialNumber: assetDetails.serialNumber,
      purchaseOrderNumber: assetDetails.purchaseOrderNumber,
      startDate: toDateInput(assetDetails.startDate),
      endDate: toDateInput(assetDetails.endDate),
      sla: assetDetails.sla,
      assetType: assetDetails.assetType,
      pinCode: assetDetails.pinCode,
      city: assetDetails.city,
      state: assetDetails.state,
      address: assetDetails.address,
      endClientId: assetDetails.endClientId,
      userId: details?.id,
      remarks: '',
      id: assetId,
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
      endDate: Yup.string()
        .required('Required')
        .test('after-start', 'End date must not be earlier than start date', function (value) {
          const { startDate } = this.parent
          if (!startDate || !value) return true
          return new Date(value) >= new Date(startDate)
        }),
      sla: Yup.string().required('Required'),
      assetType: Yup.string().required('Required'),
      pinCode: Yup.string().required('Required'),
      city: Yup.string().required('Required'),
      state: Yup.string().required('Required'),
      address: Yup.string().required('Required'),
      endClientId: Yup.string().required('Required'),
      remarks: Yup.string().required('Required').min(10, 'Minimum 10 characters required'),
    }),
    onSubmit: (values) => {
      EditAsset(values, router, () => {
        onSaved()
        onClose()
      })
    },
  })

  useEffect(() => {
    if (!assetId) return
    getAssetDetails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId])

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Edit Asset</h2>
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
                  <label className={styles.formLabel}>End Client</label>
                  <CappedSelect
                    name="endClientId"
                    value={formik.values.endClientId || ''}
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
                  <label className={styles.formLabel}>Serial Number</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    name="serialNumber"
                    value={formik.values.serialNumber || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                  {formik.touched.serialNumber && formik.errors.serialNumber && (
                    <span className={styles.formFeedbackInvalid}>{formik.errors.serialNumber}</span>
                  )}
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>PO Number</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    name="purchaseOrderNumber"
                    value={formik.values.purchaseOrderNumber || ''}
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
                  <label className={styles.formLabel}>Asset Type</label>
                  <CappedSelect
                    name="assetType"
                    value={formik.values.assetType || ''}
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
                    value={formik.values.startDate || ''}
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
                    value={formik.values.endDate || ''}
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
                    value={formik.values.sla || ''}
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
                    name="address"
                    value={formik.values.address || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                  {formik.touched.address && formik.errors.address && (
                    <span className={styles.formFeedbackInvalid}>{formik.errors.address}</span>
                  )}
                </div>
                <div className={`${styles.formField} ${styles.full}`}>
                  <label className={styles.formLabel}>Remarks</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    name="remarks"
                    value={formik.values.remarks || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                  {formik.touched.remarks && formik.errors.remarks && (
                    <span className={styles.formFeedbackInvalid}>{formik.errors.remarks}</span>
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

export default EditAssetModal
