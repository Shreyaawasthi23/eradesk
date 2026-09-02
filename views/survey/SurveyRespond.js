import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { apiUrl, tenant } from '@/lib/config'
import styles from './SurveyRespond.module.scss'

const SurveyRespond = () => {
  const router = useRouter()
  const { id } = router.query
  const [survey, setSurvey] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!id) return
    const headers = new Headers()
    headers.append('X-Tenant', '' + tenant + '')
    fetch(apiUrl + '/api/public/survey/get-response?id=' + id, { method: 'GET', headers, redirect: 'follow' })
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then((data) => {
        setSurvey(data)
        if (data.status === 'SUBMITTED') setSubmitted(true)
      })
      .catch(() => setNotFound(true))
  }, [id])

  const setAnswer = (questionId, value) => setAnswers((prev) => ({ ...prev, [questionId]: value }))

  const submit = async () => {
    setSubmitting(true)
    try {
      const headers = new Headers()
      headers.append('X-Tenant', '' + tenant + '')
      headers.append('Content-Type', 'application/json')
      const payload = {
        answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value })),
      }
      const response = await fetch(apiUrl + '/api/public/survey/submit?id=' + id, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        redirect: 'follow',
      })
      const data = await response.json()
      if (data.statusCode === 200) {
        setSubmitted(true)
      } else {
        alert(data.message)
      }
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (notFound) {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <div className={styles.errorState}>This survey link is invalid or has expired.</div>
        </div>
      </div>
    )
  }

  if (!survey) {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <div className={styles.errorState}>Loading...</div>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <div className={styles.thankYou}>
            <h1 className={styles.title}>Thank you!</h1>
            <p className={styles.subtitle}>Your feedback has been recorded.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>{survey.templateTitle}</h1>
        <p className={styles.subtitle}>We&apos;d love to hear about your experience with {survey.incidentId}.</p>

        {survey.questions.map((q) => (
          <div key={q.id} className={styles.question}>
            <div className={styles.questionLabel}>{q.text}</div>
            {q.type === 'RATING' && (
              <div className={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={answers[q.id] === n ? styles.ratingBtnActive : styles.ratingBtn}
                    onClick={() => setAnswer(q.id, n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
            {q.type === 'TEXT' && (
              <textarea
                className={styles.textArea}
                value={answers[q.id] || ''}
                onChange={(e) => setAnswer(q.id, e.target.value)}
              />
            )}
            {q.type === 'MULTIPLE_CHOICE' && (
              <div className={styles.optionRow}>
                {(q.options || []).map((opt) => (
                  <label key={opt} className={styles.optionLabel}>
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === opt}
                      onChange={() => setAnswer(q.id, opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}

        <button type="button" className={styles.submitBtn} onClick={submit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </div>
    </div>
  )
}

export default SurveyRespond
