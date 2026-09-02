import React from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import styles from '../itil/itil.module.scss'

const categories = ['Design', 'Productivity', 'Development', 'Security', 'Operating System', 'Other']

const SoftwareModal = ({ onClose, onSubmit }) => {
  const formik = useFormik({
    initialValues: { name: '', publisher: '', category: 'Other' },
    validationSchema: Yup.object({
      name: Yup.string().max(150).required('Required'),
    }),
    onSubmit: (values) => onSubmit(values),
  })

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>New Software</h2>
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
              <div className={styles.formField}>
                <label className={styles.formLabel}>Publisher</label>
                <input
                  type="text"
                  className={styles.formInput}
                  name="publisher"
                  value={formik.values.publisher}
                  onChange={formik.handleChange}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Category</label>
                <select className={styles.formInput} name="category" value={formik.values.category} onChange={formik.handleChange}>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
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

export default SoftwareModal
