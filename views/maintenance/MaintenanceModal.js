import React from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import styles from '../itil/itil.module.scss'

const MaintenanceModal = ({ onClose, onSubmit }) => {
  const formik = useFormik({
    initialValues: { name: '', description: '', startDate: '', endDate: '', servicesText: '', sitesText: '' },
    validationSchema: Yup.object({
      name: Yup.string().max(150).required('Required'),
      startDate: Yup.string().required('Required'),
      endDate: Yup.string().required('Required'),
    }),
    onSubmit: (values) => {
      onSubmit({
        name: values.name,
        description: values.description,
        startDate: values.startDate,
        endDate: values.endDate,
        servicesAffected: values.servicesText.split(',').map((s) => s.trim()).filter(Boolean),
        sitesAffected: values.sitesText.split(',').map((s) => s.trim()).filter(Boolean),
      })
    },
  })

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>New Maintenance Window</h2>
          <button type="button" className={styles.modalClose} onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={formik.handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGrid}>
              <div className={`${styles.formField} ${styles.full}`}>
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
              <div className={`${styles.formField} ${styles.full}`}>
                <label className={styles.formLabel}>Description</label>
                <textarea
                  className={styles.formTextarea}
                  name="description"
                  value={formik.values.description}
                  onChange={formik.handleChange}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Start</label>
                <input
                  type="datetime-local"
                  className={styles.formInput}
                  name="startDate"
                  value={formik.values.startDate}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.startDate && formik.errors.startDate && (
                  <span className={styles.formFeedbackInvalid}>{formik.errors.startDate}</span>
                )}
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>End</label>
                <input
                  type="datetime-local"
                  className={styles.formInput}
                  name="endDate"
                  value={formik.values.endDate}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.endDate && formik.errors.endDate && (
                  <span className={styles.formFeedbackInvalid}>{formik.errors.endDate}</span>
                )}
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Services Affected</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Email, VPN (comma separated)"
                  name="servicesText"
                  value={formik.values.servicesText}
                  onChange={formik.handleChange}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Sites Affected</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="HQ, Branch Office (comma separated)"
                  name="sitesText"
                  value={formik.values.sitesText}
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
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default MaintenanceModal
