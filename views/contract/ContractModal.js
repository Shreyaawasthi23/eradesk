import React from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import styles from '../itil/itil.module.scss'

const typeOptions = ['AMC', 'WARRANTY', 'SERVICE', 'LICENSE', 'LEASE', 'OTHER']

const ContractModal = ({ vendorList, onClose, onSubmit }) => {
  const formik = useFormik({
    initialValues: {
      vendorId: '',
      type: 'AMC',
      description: '',
      startDate: '',
      endDate: '',
      renewalDate: '',
      cost: '',
    },
    validationSchema: Yup.object({
      vendorId: Yup.string().required('Required'),
      startDate: Yup.string().required('Required'),
      endDate: Yup.string().required('Required'),
    }),
    onSubmit: (values) => onSubmit(values),
  })

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>New Contract</h2>
          <button type="button" className={styles.modalClose} onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={formik.handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Vendor</label>
                <select className={styles.formInput} name="vendorId" value={formik.values.vendorId} onChange={formik.handleChange}>
                  <option value="">Select vendor</option>
                  {(vendorList || []).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                {formik.touched.vendorId && formik.errors.vendorId && (
                  <span className={styles.formFeedbackInvalid}>{formik.errors.vendorId}</span>
                )}
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Type</label>
                <select className={styles.formInput} name="type" value={formik.values.type} onChange={formik.handleChange}>
                  {typeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Start Date</label>
                <input
                  type="date"
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
                <label className={styles.formLabel}>End Date</label>
                <input
                  type="date"
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
                <label className={styles.formLabel}>Renewal Date</label>
                <input
                  type="date"
                  className={styles.formInput}
                  name="renewalDate"
                  value={formik.values.renewalDate}
                  onChange={formik.handleChange}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Cost</label>
                <input
                  type="number"
                  className={styles.formInput}
                  name="cost"
                  value={formik.values.cost}
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
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ContractModal
