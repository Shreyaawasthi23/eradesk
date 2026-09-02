import React from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import styles from '../itil/itil.module.scss'

const VendorModal = ({ title, submitLabel, initialValues, onClose, onSubmit }) => {
  const formik = useFormik({
    initialValues: {
      name: initialValues?.name || '',
      contactPerson: initialValues?.contactPerson || '',
      email: initialValues?.email || '',
      phone: initialValues?.phone || '',
      address: initialValues?.address || '',
      website: initialValues?.website || '',
      status: initialValues?.status ?? true,
    },
    validationSchema: Yup.object({
      name: Yup.string().max(100).required('Required'),
      email: Yup.string().email('Invalid email address'),
    }),
    onSubmit: (values) => onSubmit(values),
  })

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button type="button" className={styles.modalClose} onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={formik.handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Vendor Name</label>
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
                <label className={styles.formLabel}>Contact Person</label>
                <input
                  type="text"
                  className={styles.formInput}
                  name="contactPerson"
                  value={formik.values.contactPerson}
                  onChange={formik.handleChange}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Email</label>
                <input
                  type="email"
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
                <label className={styles.formLabel}>Phone</label>
                <input
                  type="text"
                  className={styles.formInput}
                  name="phone"
                  value={formik.values.phone}
                  onChange={formik.handleChange}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Website</label>
                <input
                  type="text"
                  className={styles.formInput}
                  name="website"
                  value={formik.values.website}
                  onChange={formik.handleChange}
                />
              </div>
              <div className={`${styles.formField} ${styles.full}`}>
                <label className={styles.formLabel}>Address</label>
                <input
                  type="text"
                  className={styles.formInput}
                  name="address"
                  value={formik.values.address}
                  onChange={formik.handleChange}
                />
              </div>
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn}>
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default VendorModal
