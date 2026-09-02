import React, { useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import styles from '../itil/itil.module.scss'

const questionTypes = ['RATING', 'MULTIPLE_CHOICE', 'TEXT']

const SurveyTemplateModal = ({ onClose, onSubmit }) => {
  const [questions, setQuestions] = useState([{ text: '', type: 'RATING', options: [] }])

  const formik = useFormik({
    initialValues: { title: '', description: '', triggerDelayHours: 1 },
    validationSchema: Yup.object({
      title: Yup.string().max(150).required('Required'),
    }),
    onSubmit: (values) => {
      const cleanQuestions = questions
        .filter((q) => q.text.trim())
        .map((q) => ({
          text: q.text,
          type: q.type,
          options: q.type === 'MULTIPLE_CHOICE' ? q.options.filter((o) => o.trim()) : [],
        }))
      if (cleanQuestions.length === 0) return
      onSubmit({ ...values, questions: cleanQuestions })
    },
  })

  const updateQuestion = (idx, field, value) => {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, [field]: value } : q)))
  }

  const updateOption = (qIdx, oIdx, value) => {
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== qIdx) return q
        const options = [...q.options]
        options[oIdx] = value
        return { ...q, options }
      }),
    )
  }

  const addOption = (qIdx) => {
    setQuestions((qs) => qs.map((q, i) => (i === qIdx ? { ...q, options: [...q.options, ''] } : q)))
  }

  const addQuestion = () => setQuestions((qs) => [...qs, { text: '', type: 'RATING', options: [] }])
  const removeQuestion = (idx) => setQuestions((qs) => qs.filter((_, i) => i !== idx))

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>New Survey Template</h2>
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
              <div className={styles.formField}>
                <label className={styles.formLabel}>Send After (hours)</label>
                <input
                  type="number"
                  min="0"
                  className={styles.formInput}
                  name="triggerDelayHours"
                  value={formik.values.triggerDelayHours}
                  onChange={formik.handleChange}
                />
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <p className={styles.detailSectionLabel}>Questions</p>
              {questions.map((q, idx) => (
                <div key={idx} className={styles.timelineItem} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input
                      type="text"
                      className={styles.formInput}
                      style={{ flex: 1 }}
                      placeholder="Question text"
                      value={q.text}
                      onChange={(e) => updateQuestion(idx, 'text', e.target.value)}
                    />
                    <select
                      className={styles.formInput}
                      value={q.type}
                      onChange={(e) => updateQuestion(idx, 'type', e.target.value)}
                    >
                      {questionTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <button type="button" className={styles.editBtn} onClick={() => removeQuestion(idx)}>
                      Remove
                    </button>
                  </div>
                  {q.type === 'MULTIPLE_CHOICE' && (
                    <div>
                      {q.options.map((o, oIdx) => (
                        <input
                          key={oIdx}
                          type="text"
                          className={styles.formInput}
                          style={{ marginBottom: 4, marginRight: 4, width: 200 }}
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
              <button type="button" className={styles.editBtn} onClick={addQuestion}>
                + Add Question
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

export default SurveyTemplateModal
