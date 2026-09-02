import React, { useEffect, useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { EditSalesParticipant } from '@/apiClients/user_api'

import styles from './sales.module.scss'

const EditSalesModal = ({ salesId, router, onClose, onSaved }) => {
  const details = getUserDetails()
  const [salesDetails, setSalesDetails] = useState({})
  const [loading, setLoading] = useState(true)

  const getSalesDetails = async () => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    try {
      const response = await fetch(apiUrl + '/auth/core/sales-team/get-details?id=' + salesId, requestOptions)
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        setSalesDetails(data || {})
      }
    } catch (error) {
      console.log('error', error)
    } finally {
      setLoading(false)
    }
  }

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: salesDetails.name,
      email: salesDetails.email,
      number: salesDetails.number,
      userId: details?.id,
      status: salesDetails.status,
      id: salesId,
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
    onSubmit: (values) => {
      EditSalesParticipant(values, router, () => {
        onSaved()
        onClose()
      })
    },
  })

  useEffect(() => {
    if (!salesId) return
    getSalesDetails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesId])

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Edit Sales Participant</h2>
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
                  <label className={styles.formLabel}>Name</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    name="name"
                    value={formik.values.name || ''}
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
                    value={formik.values.email || ''}
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
                    value={formik.values.number || ''}
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
                    value={formik.values.status ?? ''}
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

export default EditSalesModal
