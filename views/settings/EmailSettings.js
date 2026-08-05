import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Swal from 'sweetalert2'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'

import styles from './emailSettings.module.scss'

const DEFAULT_TEMPLATE =
  'Hi {{name}},\n\nThank you for contacting support. Your incident has been logged with reference {{incidentId}}. Our team will get back to you shortly.\n\nRegards,\nSupport Team'

const EmailSettings = () => {
  const details = getUserDetails()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [supportEmail, setSupportEmail] = useState('')
  const [gmailConfigured, setGmailConfigured] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true)
  const [autoReplyTemplate, setAutoReplyTemplate] = useState(DEFAULT_TEMPLATE)
  const [dlList, setDlList] = useState([])
  const [dlInput, setDlInput] = useState('')

  const getSettings = async () => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    try {
      const response = await fetch(apiUrl + '/auth/email-settings/get', requestOptions)
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setSupportEmail(data.supportEmail || '')
          setGmailConfigured(!!data.gmailConfigured)
          setEnabled(!!data.enabled)
          setAutoReplyEnabled(data.autoReplyEnabled ?? true)
          setAutoReplyTemplate(data.autoReplyTemplate || DEFAULT_TEMPLATE)
          setDlList(Array.isArray(data.dlList) ? data.dlList : [])
        }
      }
    } catch (error) {
      console.log('error', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Content-Type', 'application/json')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: JSON.stringify({ enabled, autoReplyEnabled, autoReplyTemplate, dlList }),
      redirect: 'follow',
    }

    try {
      const response = await fetch(apiUrl + '/auth/email-settings/save', requestOptions)
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        Swal.fire('Saved', data.message, 'success')
      }
    } catch (error) {
      Swal.fire('Oops!', 'Could not save settings', 'warning')
    }
  }

  const addDlEmail = () => {
    const email = dlInput.trim().toLowerCase()
    if (!email || dlList.length >= 6) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Swal.fire('Invalid email', 'Enter a valid email address', 'warning')
      return
    }
    if (dlList.includes(email)) {
      setDlInput('')
      return
    }
    setDlList([...dlList, email])
    setDlInput('')
  }

  const removeDlEmail = (email) => {
    setDlList(dlList.filter((e) => e !== email))
  }

  useEffect(() => {
    getSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.card} style={{ padding: 24 }}>
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Email Settings</h1>
          <p className={styles.pageSubtitle}>
            Turn support emails into incidents automatically
          </p>
        </div>
      </div>

      <div className={styles.card} style={{ padding: '20px 24px', marginBottom: 16 }}>
        <div className={styles.formField} style={{ marginBottom: 16 }}>
          <label className={styles.formLabel}>Support Email</label>
          <input className={styles.formInput} value={supportEmail} disabled />
          <span
            className={gmailConfigured ? styles.validityValid : styles.validityExpired}
            style={{ fontSize: 12, marginTop: 4 }}
          >
            {gmailConfigured ? 'Gmail connection configured' : 'Gmail is not configured yet'}
          </span>
          <span style={{ fontSize: 12, color: '#1752a6', marginTop: 4, fontWeight: '700' }}>
            The mailbox is checked automatically. Every incoming email creates an incident and
            (if enabled below) an auto-reply — Sales Team is CC&apos;d automatically when the
            sender matches a known Front/End Client.
          </span>
        </div>

        <div className={styles.formField} style={{ marginBottom: 16 }}>
          <label className={styles.rememberLabel ? undefined : styles.formLabel}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            Create incidents from incoming emails
          </label>
        </div>

        <div className={styles.formField} style={{ marginBottom: 16 }}>
          <label className={styles.formLabel}>
            <input
              type="checkbox"
              checked={autoReplyEnabled}
              onChange={(e) => setAutoReplyEnabled(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            Send auto-reply to the customer
          </label>
        </div>

        <div className={styles.formField} style={{ marginBottom: 16 }}>
          <label className={styles.formLabel}>Auto-reply template</label>
          <textarea
            className={styles.formInput}
            rows={6}
            value={autoReplyTemplate}
            onChange={(e) => setAutoReplyTemplate(e.target.value)}
          />
          <span style={{ fontSize: 12, color: 'var(--fc-ink-muted)', marginTop: 4 }}>
            Use <code>{'{{name}}'}</code> and <code>{'{{incidentId}}'}</code> as placeholders.
          </span>
        </div>

        <div className={styles.formField} style={{ marginBottom: 16 }}>
          <label className={styles.formLabel}>DL List (max 6, BCC&apos;d on every auto-reply)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className={styles.formInput}
              type="email"
              placeholder="name@company.com"
              value={dlInput}
              onChange={(e) => setDlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addDlEmail()
                }
              }}
              disabled={dlList.length >= 6}
            />
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={addDlEmail}
              disabled={dlList.length >= 6 || !dlInput.trim()}
            >
              Add
            </button>
          </div>
          {dlList.length >= 6 && (
            <span style={{ fontSize: 12, color: 'var(--fc-danger, #dc2626)', marginTop: 4 }}>
              Maximum of 6 addresses reached.
            </span>
          )}
          {dlList.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {dlList.map((email) => (
                <span
                  key={email}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: 'var(--fc-bg, #f7f8fa)',
                    border: '1px solid var(--fc-border, #e6e9ef)',
                    fontSize: 13,
                  }}
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => removeDlEmail(email)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      lineHeight: 1,
                      color: 'var(--fc-ink-muted, #64748b)',
                    }}
                    aria-label={`Remove ${email}`}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className={styles.submitBtn} onClick={saveSettings}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}

export default EmailSettings
