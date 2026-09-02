import React, { useEffect, useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import moment from 'moment'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { editPurchase } from '@/api/purchase_api'
import CappedSelect from '@/components/ui/CappedSelect'

import styles from './purchase.module.scss'

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

const toDateInput = (date) => (date ? moment(date).format('YYYY-MM-DD') : '')

const EditPurchaseModal = ({ purchaseId, router, endClientList, salesList, onClose, onSaved }) => {
  const details = getUserDetails()
  const [purchaseDetails, setPurchaseDetails] = useState({})
  const [loading, setLoading] = useState(true)

  const getPurchaseDetails = () => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    fetch(apiUrl + '/auth/core/purchase/get-details?id=' + purchaseId, requestOptions)
      .then((response) => (response.status === 401 ? router.push('/') : response.json()))
      .then((result) => {
        setPurchaseDetails(result || {})
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      endClientId: purchaseDetails.endClientId,
      purchaseOrderNumber: purchaseDetails.purchaseOrderNumber,
      contactName: purchaseDetails.contactName,
      contactNumber: purchaseDetails.contactNumber,
      contactEmail: purchaseDetails.contactEmail,
      startDate: toDateInput(purchaseDetails.startDate),
      endDate: toDateInput(purchaseDetails.endDate),
      poReceiveDate: purchaseDetails.poReceiveDate,
      type: purchaseDetails.type,
      salesId: purchaseDetails.salesId,
      userId: details?.id,
      status: purchaseDetails.status,
      value: purchaseDetails.value,
      remarks: '',
      id: purchaseId,
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
      endDate: Yup.string()
        .required('Required')
        .test('after-start', 'End date must not be earlier than start date', function (value) {
          const { startDate } = this.parent
          if (!startDate || !value) return true
          return new Date(value) >= new Date(startDate)
        }),
      poReceiveDate: Yup.string().required('Required'),
      type: Yup.string().required('Required'),
      status: Yup.boolean()
        .oneOf([true, false], 'Invalid input. Please select a value.')
        .required('Status is required'),
      value: Yup.number()
        .typeError('Order value must be a number')
        .positive('Order value must be positive')
        .required('Order value is required'),
      remarks: Yup.string().min(10, 'Must be 10 characters').required('Required'),
    }),
    onSubmit: (values) => {
      editPurchase(values, router, () => {
        onSaved()
        onClose()
      })
    },
  })

  useEffect(() => {
    if (!purchaseId) return
    getPurchaseDetails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseId])

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Edit Purchase Order</h2>
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
                  <label className={styles.formLabel}>Sales Person</label>
                  <CappedSelect
                    name="salesId"
                    value={formik.values.salesId || ''}
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
                    value={formik.values.startDate || ''}
                    onChange={formik.handleChange}
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
                    onChange={formik.handleChange}
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
                    value={formik.values.poReceiveDate || ''}
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
                    value={formik.values.type || ''}
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
                    value={formik.values.value ?? ''}
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
                    value={formik.values.status ?? ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  >
                    <option value={true}>Active</option>
                    <option value={false}>Deactive</option>
                  </select>
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

export default EditPurchaseModal
