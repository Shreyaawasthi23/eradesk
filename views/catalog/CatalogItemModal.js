import React, { useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import styles from '../itil/itil.module.scss'

const FIELD_TYPES = ['TEXT', 'NUMBER', 'EMAIL', 'PHONE', 'DATE', 'DROPDOWN', 'MULTISELECT', 'CHECKBOX', 'RICH_TEXT']

const CatalogItemModal = ({ engineerList, onClose, onSubmit }) => {
  const [fields, setFields] = useState([{ label: '', type: 'TEXT', required: false, options: [] }])

  const formik = useFormik({
    initialValues: {
      name: '',
      description: '',
      category: 'General',
      approvalRequired: false,
      approverIds: [],
      slaHours: 24,
      assignmentGroup: '',
      cost: '',
    },
    validationSchema: Yup.object({
      name: Yup.string().max(150).required('Required'),
    }),
    onSubmit: (values) => {
      onSubmit({
        ...values,
        slaHours: Number(values.slaHours),
        cost: values.cost === '' ? null : Number(values.cost),
        formFields: fields.filter((f) => f.label.trim()),
      })
    },
  })

  const updateField = (idx, key, value) => setFields((fs) => fs.map((f, i) => (i === idx ? { ...f, [key]: value } : f)))
  const updateOption = (idx, oIdx, value) =>
    setFields((fs) =>
      fs.map((f, i) => {
        if (i !== idx) return f
        const options = [...f.options]
        options[oIdx] = value
        return { ...f, options }
      }),
    )
  const addOption = (idx) => setFields((fs) => fs.map((f, i) => (i === idx ? { ...f, options: [...f.options, ''] } : f)))
  const addField = () => setFields((fs) => [...fs, { label: '', type: 'TEXT', required: false, options: [] }])
  const removeField = (idx) => setFields((fs) => fs.filter((_, i) => i !== idx))

  const toggleApprover = (id) => {
    formik.setFieldValue(
      'approverIds',
      formik.values.approverIds.includes(id)
        ? formik.values.approverIds.filter((a) => a !== id)
        : [...formik.values.approverIds, id],
    )
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>New Catalog Item</h2>
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
                <label className={styles.formLabel}>Category</label>
                <input
                  type="text"
                  className={styles.formInput}
                  name="category"
                  value={formik.values.category}
                  onChange={formik.handleChange}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>SLA (hours)</label>
                <input
                  type="number"
                  className={styles.formInput}
                  name="slaHours"
                  value={formik.values.slaHours}
                  onChange={formik.handleChange}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Assignment Group</label>
                <input
                  type="text"
                  className={styles.formInput}
                  name="assignmentGroup"
                  value={formik.values.assignmentGroup}
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
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={formik.values.approvalRequired}
                  onChange={(e) => formik.setFieldValue('approvalRequired', e.target.checked)}
                />
                Requires approval before fulfillment
              </label>
              {formik.values.approvalRequired && (
                <div style={{ marginTop: 8 }}>
                  <p className={styles.formLabel}>Approvers</p>
                  {(engineerList || []).map((e) => (
                    <label key={e.id} style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
                      <input
                        type="checkbox"
                        checked={formik.values.approverIds.includes(e.id)}
                        onChange={() => toggleApprover(e.id)}
                      />{' '}
                      {e.firstName ? `${e.firstName} ${e.lastName || ''}` : e.email}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: 16 }}>
              <p className={styles.detailSectionLabel}>Request Form Fields</p>
              {fields.map((f, idx) => (
                <div key={idx} className={styles.timelineItem} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input
                      type="text"
                      className={styles.formInput}
                      style={{ flex: 1 }}
                      placeholder="Field label"
                      value={f.label}
                      onChange={(e) => updateField(idx, 'label', e.target.value)}
                    />
                    <select className={styles.formInput} value={f.type} onChange={(e) => updateField(idx, 'type', e.target.value)}>
                      {FIELD_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input type="checkbox" checked={f.required} onChange={(e) => updateField(idx, 'required', e.target.checked)} />
                      Required
                    </label>
                    <button type="button" className={styles.editBtn} onClick={() => removeField(idx)}>
                      Remove
                    </button>
                  </div>
                  {['DROPDOWN', 'MULTISELECT'].includes(f.type) && (
                    <div>
                      {f.options.map((o, oIdx) => (
                        <input
                          key={oIdx}
                          type="text"
                          className={styles.formInput}
                          style={{ marginBottom: 4, marginRight: 4, width: 180 }}
                          placeholder={`Option ${oIdx + 1}`}
                          value={o}
                          onChange={(e) => updateOption(idx, oIdx, e.target.value)}
                        />
                      ))}
                      <button type="button" className={styles.editBtn} onClick={() => addOption(idx)}>
                        + Option
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <button type="button" className={styles.editBtn} onClick={addField}>
                + Add Field
              </button>
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

export default CatalogItemModal
