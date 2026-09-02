import React from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import styles from './knowledge.module.scss'

const CATEGORIES = ['General', 'Hardware', 'Software', 'Network', 'Access', 'Email', 'Security']

const KnowledgeArticleModal = ({ title, submitLabel, initialValues, onClose, onSubmit }) => {
  const formik = useFormik({
    initialValues: {
      title: initialValues?.title || '',
      description: initialValues?.description || '',
      category: initialValues?.category || 'General',
      tagsText: (initialValues?.tags || []).join(', '),
      visibility: initialValues?.visibility || 'INTERNAL',
      status: initialValues?.status || 'DRAFT',
    },
    validationSchema: Yup.object({
      title: Yup.string().max(150, 'Must be 150 characters or less').required('Required'),
      description: Yup.string().required('Required'),
      category: Yup.string().required('Required'),
    }),
    onSubmit: (values) => {
      onSubmit({
        ...values,
        tags: values.tagsText
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      })
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
                <label className={styles.formLabel}>Description / Solution</label>
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
              <div className={styles.formField}>
                <label className={styles.formLabel}>Category</label>
                <select
                  className={styles.formInput}
                  name="category"
                  value={formik.values.category}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Visibility</label>
                <select
                  className={styles.formInput}
                  name="visibility"
                  value={formik.values.visibility}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                >
                  <option value="INTERNAL">Internal (technicians only)</option>
                  <option value="PUBLIC">Public (self-service portal)</option>
                </select>
              </div>
              <div className={`${styles.formField} ${styles.full}`}>
                <label className={styles.formLabel}>Tags (comma separated)</label>
                <input
                  type="text"
                  className={styles.formInput}
                  name="tagsText"
                  placeholder="vpn, network, password-reset"
                  value={formik.values.tagsText}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </div>
              {!initialValues?.id && (
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Save as</label>
                  <select
                    className={styles.formInput}
                    name="status"
                    value={formik.values.status}
                    onChange={formik.handleChange}
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                  </select>
                </div>
              )}
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

export default KnowledgeArticleModal
