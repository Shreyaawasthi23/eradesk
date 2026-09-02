import React, { useState } from 'react'
import styles from '../itil/itil.module.scss'

const RequestFormModal = ({ item, onClose, onSubmit }) => {
  const [values, setValues] = useState({})

  const setValue = (fieldId, value) => setValues((prev) => ({ ...prev, [fieldId]: value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({ catalogItemId: item.id, formData: values })
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{item.name}</h2>
          <button type="button" className={styles.modalClose} onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {item.description && <p className={styles.detailSectionBody} style={{ marginBottom: 16 }}>{item.description}</p>}
            <div className={styles.formGrid}>
              {item.formFields.map((f) => (
                <div key={f.id} className={`${styles.formField} ${styles.full}`}>
                  <label className={styles.formLabel}>
                    {f.label}
                    {f.required && ' *'}
                  </label>
                  {f.type === 'TEXT' || f.type === 'EMAIL' || f.type === 'PHONE' || f.type === 'NUMBER' ? (
                    <input
                      type={f.type === 'NUMBER' ? 'number' : f.type === 'EMAIL' ? 'email' : 'text'}
                      className={styles.formInput}
                      required={f.required}
                      value={values[f.id] || ''}
                      onChange={(e) => setValue(f.id, e.target.value)}
                    />
                  ) : f.type === 'DATE' ? (
                    <input
                      type="date"
                      className={styles.formInput}
                      required={f.required}
                      value={values[f.id] || ''}
                      onChange={(e) => setValue(f.id, e.target.value)}
                    />
                  ) : f.type === 'RICH_TEXT' ? (
                    <textarea
                      className={styles.formTextarea}
                      required={f.required}
                      value={values[f.id] || ''}
                      onChange={(e) => setValue(f.id, e.target.value)}
                    />
                  ) : f.type === 'DROPDOWN' ? (
                    <select
                      className={styles.formInput}
                      required={f.required}
                      value={values[f.id] || ''}
                      onChange={(e) => setValue(f.id, e.target.value)}
                    >
                      <option value="">Select...</option>
                      {f.options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : f.type === 'MULTISELECT' ? (
                    <div>
                      {f.options.map((o) => (
                        <label key={o} style={{ display: 'block', fontSize: 13 }}>
                          <input
                            type="checkbox"
                            checked={(values[f.id] || []).includes(o)}
                            onChange={(e) => {
                              const current = values[f.id] || []
                              setValue(f.id, e.target.checked ? [...current, o] : current.filter((v) => v !== o))
                            }}
                          />{' '}
                          {o}
                        </label>
                      ))}
                    </div>
                  ) : f.type === 'CHECKBOX' ? (
                    <input
                      type="checkbox"
                      checked={!!values[f.id]}
                      onChange={(e) => setValue(f.id, e.target.checked)}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn}>
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RequestFormModal
