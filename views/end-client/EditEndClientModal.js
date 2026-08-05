import React, { useEffect, useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { editEndClient } from '@/api/endclient_api'

import styles from './endclient.module.scss'
import CappedSelect from '@/components/ui/CappedSelect'
import MultiSelect from '@/components/ui/MultiSelect'

const EditEndClientModal = ({ clientId, router, frontClientList, salesList, onClose, onSaved }) => {
  const details = getUserDetails()
  const [clientDetails, setClientDetails] = useState({})
  const [loading, setLoading] = useState(true)

  const getEndCLientDeatils = () => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    fetch(apiUrl + '/auth/end-client/details?id=' + clientId, requestOptions)
      .then((response) => (response.status === 401 ? router.push('/') : response.json()))
      .then((result) => {
        setClientDetails(result || {})
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: clientDetails.name,
      contactName: clientDetails.contactName,
      contactNumber: clientDetails.contactNumber,
      contactEmail: clientDetails.contactEmail,
      frontClientId: clientDetails.frontClientId,
      userId: clientDetails.userId,
      status: clientDetails.status,
      salesIds: clientDetails.salesIds || [],
      remarks: '',
      id: clientId,
    },
    validationSchema: Yup.object({
      frontClientId: Yup.string().required('Required'),
      contactName: Yup.string().max(100, 'Must be 100 characters or less').required('Required'),
      contactNumber: Yup.string()
        .min(10, 'Must be 10 characters')
        .max(11, 'Must not be more than 11 characters')
        .required('Required')
        .matches(/^[0-9]+$/, 'Invalid input. Only numbers are allowed.'),
      contactEmail: Yup.string().email('Invalid email address').required('Required'),
      status: Yup.boolean()
        .oneOf([true, false], 'Invalid input. Please select a value.')
        .required('Status is required'),
      remarks: Yup.string()
        .min(10, 'Must be 10 characters')
        .max(25, 'Must not be more than 25 characters')
        .required('Required'),
    }),
    onSubmit: (values) => {
      editEndClient(values, router, () => {
        onSaved()
        onClose()
      })
    },
  })

  useEffect(() => {
    if (!clientId) return
    getEndCLientDeatils()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Edit End Client</h2>
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
                <div className={`${styles.formField} ${styles.full}`}>
                  <label className={styles.formLabel}>Front Client</label>
                  <CappedSelect
                    name="frontClientId"
                    value={formik.values.frontClientId || ''}
                    onChange={formik.handleChange}
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
                    value={formik.values.name || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
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

export default EditEndClientModal
