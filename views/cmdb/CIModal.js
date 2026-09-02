import React from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import styles from '../itil/itil.module.scss'

const typeOptions = [
  'SERVER', 'DESKTOP', 'LAPTOP', 'APPLICATION', 'DATABASE',
  'VIRTUAL_MACHINE', 'CLOUD_RESOURCE', 'NETWORK_DEVICE', 'OTHER',
]

const CIModal = ({ title, submitLabel, onClose, onSubmit }) => {
  const formik = useFormik({
    initialValues: {
      name: '',
      type: 'SERVER',
      ipAddress: '',
      macAddress: '',
      operatingSystem: '',
      version: '',
      owner: '',
      vendor: '',
      description: '',
    },
    validationSchema: Yup.object({
      name: Yup.string().max(150, 'Must be 150 characters or less').required('Required'),
      type: Yup.string().required('Required'),
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
                <label className={styles.formLabel}>Type</label>
                <select className={styles.formInput} name="type" value={formik.values.type} onChange={formik.handleChange}>
                  {typeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>IP Address</label>
                <input
                  type="text"
                  className={styles.formInput}
                  name="ipAddress"
                  value={formik.values.ipAddress}
                  onChange={formik.handleChange}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>MAC Address</label>
                <input
                  type="text"
                  className={styles.formInput}
                  name="macAddress"
                  value={formik.values.macAddress}
                  onChange={formik.handleChange}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Operating System</label>
                <input
                  type="text"
                  className={styles.formInput}
                  name="operatingSystem"
                  value={formik.values.operatingSystem}
                  onChange={formik.handleChange}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Version</label>
                <input
                  type="text"
                  className={styles.formInput}
                  name="version"
                  value={formik.values.version}
                  onChange={formik.handleChange}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Owner</label>
                <input
                  type="text"
                  className={styles.formInput}
                  name="owner"
                  value={formik.values.owner}
                  onChange={formik.handleChange}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Vendor</label>
                <input
                  type="text"
                  className={styles.formInput}
                  name="vendor"
                  value={formik.values.vendor}
                  onChange={formik.handleChange}
                />
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

export default CIModal
