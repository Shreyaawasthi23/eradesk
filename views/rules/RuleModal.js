import React, { useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import styles from '../itil/itil.module.scss'

const ENTITY_TYPES = ['Incident', 'Problem', 'Change', 'Release']
const TRIGGERS = ['ON_CREATE', 'ON_UPDATE', 'ON_STATUS_CHANGE']
const OPERATORS = ['EQUALS', 'NOT_EQUALS', 'CONTAINS', 'NOT_CONTAINS', 'STARTS_WITH', 'ENDS_WITH', 'GREATER_THAN', 'LESS_THAN', 'REGEX']
const ACTION_TYPES = ['SET_FIELD', 'ASSIGN_GROUP', 'NOTIFY']

const RuleModal = ({ onClose, onSubmit }) => {
  const [conditions, setConditions] = useState([{ field: '', operator: 'EQUALS', value: '', junction: 'AND' }])
  const [actions, setActions] = useState([{ type: 'SET_FIELD', field: '', value: '' }])

  const formik = useFormik({
    initialValues: { name: '', entityType: 'Incident', trigger: 'ON_CREATE', priority: 0, continueAfterMatch: true },
    validationSchema: Yup.object({
      name: Yup.string().max(150).required('Required'),
    }),
    onSubmit: (values) => {
      onSubmit({
        ...values,
        priority: Number(values.priority) || 0,
        conditions: conditions.filter((c) => c.field.trim()),
        actions: actions.filter((a) => a.type === 'NOTIFY' || a.field?.trim()),
      })
    },
  })

  const updateCondition = (idx, field, value) =>
    setConditions((cs) => cs.map((c, i) => (i === idx ? { ...c, [field]: value } : c)))
  const addCondition = () => setConditions((cs) => [...cs, { field: '', operator: 'EQUALS', value: '', junction: 'AND' }])
  const removeCondition = (idx) => setConditions((cs) => cs.filter((_, i) => i !== idx))

  const updateAction = (idx, field, value) => setActions((as) => as.map((a, i) => (i === idx ? { ...a, [field]: value } : a)))
  const addAction = () => setActions((as) => [...as, { type: 'SET_FIELD', field: '', value: '' }])
  const removeAction = (idx) => setActions((as) => as.filter((_, i) => i !== idx))

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>New Business Rule</h2>
          <button type="button" className={styles.modalClose} onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={formik.handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGrid}>
              <div className={`${styles.formField} ${styles.full}`}>
                <label className={styles.formLabel}>Rule Name</label>
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
                <label className={styles.formLabel}>Entity Type</label>
                <select className={styles.formInput} name="entityType" value={formik.values.entityType} onChange={formik.handleChange}>
                  {ENTITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Trigger</label>
                <select className={styles.formInput} name="trigger" value={formik.values.trigger} onChange={formik.handleChange}>
                  {TRIGGERS.map((t) => (
                    <option key={t} value={t}>
                      {t.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Priority (lower runs first)</label>
                <input
                  type="number"
                  className={styles.formInput}
                  name="priority"
                  value={formik.values.priority}
                  onChange={formik.handleChange}
                />
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <p className={styles.detailSectionLabel}>Conditions (WHEN)</p>
              {conditions.map((c, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  {idx > 0 && (
                    <select
                      className={styles.formInput}
                      style={{ width: 70 }}
                      value={c.junction}
                      onChange={(e) => updateCondition(idx, 'junction', e.target.value)}
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  )}
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="field (e.g. title, priority)"
                    value={c.field}
                    onChange={(e) => updateCondition(idx, 'field', e.target.value)}
                  />
                  <select className={styles.formInput} value={c.operator} onChange={(e) => updateCondition(idx, 'operator', e.target.value)}>
                    {OPERATORS.map((op) => (
                      <option key={op} value={op}>
                        {op.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="value"
                    value={c.value}
                    onChange={(e) => updateCondition(idx, 'value', e.target.value)}
                  />
                  <button type="button" className={styles.editBtn} onClick={() => removeCondition(idx)}>
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className={styles.editBtn} onClick={addCondition}>
                + Condition
              </button>
            </div>

            <div style={{ marginTop: 16 }}>
              <p className={styles.detailSectionLabel}>Actions (THEN)</p>
              {actions.map((a, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <select className={styles.formInput} value={a.type} onChange={(e) => updateAction(idx, 'type', e.target.value)}>
                    {ACTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                  {a.type === 'SET_FIELD' && (
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="field"
                      value={a.field || ''}
                      onChange={(e) => updateAction(idx, 'field', e.target.value)}
                    />
                  )}
                  {a.type !== 'NOTIFY' && (
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="value"
                      value={a.value || ''}
                      onChange={(e) => updateAction(idx, 'value', e.target.value)}
                    />
                  )}
                  {a.type === 'NOTIFY' && (
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="userId to notify"
                      value={a.userId || ''}
                      onChange={(e) => updateAction(idx, 'userId', e.target.value)}
                    />
                  )}
                  <button type="button" className={styles.editBtn} onClick={() => removeAction(idx)}>
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className={styles.editBtn} onClick={addAction}>
                + Action
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

export default RuleModal
