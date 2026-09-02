import React from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import styles from '../itil/itil.module.scss'

const priorityOptions = [
  { value: 1, label: 'P1 - Critical' },
  { value: 2, label: 'P2 - High' },
  { value: 3, label: 'P3 - Medium' },
  { value: 4, label: 'P4 - Low' },
]

const ProblemModal = ({ title, submitLabel, engineerList, onClose, onSubmit }) => {
  const formik = useFormik({
    initialValues: {
      title: '',
      description: '',
      priority: 3,
      symptoms: '',
      engineerId: '',
    },
    validationSchema: Yup.object({
      title: Yup.string().max(150, 'Must be 150 characters or less').required('Required'),
      description: Yup.string().required('Required'),
    }),
    onSubmit: (values) => {
      onSubmit({ ...values, priority: Number(values.priority) })
    },
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
              <div className={`${styles.formField} ${styles.full}`}>
                <label className={styles.formLabel}>Title</label>
                <input
                  type="text"
                  className={styles.formInput}
                  name="title"
                  value={formik.values.title}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.title && formik.errors.title && (
                  <span className={styles.formFeedbackInvalid}>{formik.errors.title}</span>
                )}
              </div>
              <div className={`${styles.formField} ${styles.full}`}>
                <label className={styles.formLabel}>Description</label>
                <textarea
                  className={styles.formTextarea}
                  name="description"
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.description && formik.errors.description && (
                  <span className={styles.formFeedbackInvalid}>{formik.errors.description}</span>
                )}
              </div>
              <div className={`${styles.formField} ${styles.full}`}>
                <label className={styles.formLabel}>Symptoms</label>
                <textarea
                  className={styles.formTextarea}
                  name="symptoms"
                  value={formik.values.symptoms}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Priority</label>
                <select
                  className={styles.formInput}
                  name="priority"
                  value={formik.values.priority}
                  onChange={formik.handleChange}
                >
                  {priorityOptions.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Assign Engineer</label>
                <select
                  className={styles.formInput}
                  name="engineerId"
                  value={formik.values.engineerId}
                  onChange={formik.handleChange}
                >
                  <option value="">Unassigned</option>
                  {(engineerList || []).map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.firstName ? `${e.firstName} ${e.lastName || ''}` : e.email}
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
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProblemModal
