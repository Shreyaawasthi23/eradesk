import React from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import styles from '../itil/itil.module.scss'

const priorities = ['LOW', 'NORMAL', 'HIGH']
const audiences = ['ALL', 'TECHNICIAN', 'END_USER']

const AnnouncementModal = ({ onClose, onSubmit }) => {
  const formik = useFormik({
    initialValues: { title: '', description: '', priority: 'NORMAL', audience: 'ALL', startDate: '', endDate: '' },
    validationSchema: Yup.object({
      title: Yup.string().max(150).required('Required'),
      startDate: Yup.string().required('Required'),
      endDate: Yup.string().required('Required'),
    }),
    onSubmit: (values) => onSubmit(values),
  })

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>New Announcement</h2>
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
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Priority</label>
                <select className={styles.formInput} name="priority" value={formik.values.priority} onChange={formik.handleChange}>
                  {priorities.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Audience</label>
                <select className={styles.formInput} name="audience" value={formik.values.audience} onChange={formik.handleChange}>
                  {audiences.map((a) => (
                    <option key={a} value={a}>
                      {a.replace('_', ' ')}
                    </option>
                  ))}
                </select>
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

export default AnnouncementModal
