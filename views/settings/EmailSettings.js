import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Swal from 'sweetalert2'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'

import styles from './emailSettings.module.scss'

const DEFAULT_ACK_TEMPLATE =
  'Hi {{name}},\n\nThank you for your update on incident {{incidentId}}. Our team has received it and will get back to you shortly.\n\nRegards,\nSupport Team'

const DEFAULT_NEW_TICKET_TEMPLATE =
  'Hi {{name}},\n\nThank you for contacting support. Your incident has been logged with reference {{incidentId}}. Our team will get back to you shortly.\n\nRegards,\nSupport Team'

const DEFAULT_EXPIRED_TICKET_TEMPLATE =
  'Hi {{name}},\n\nThank you for contacting support. Your incident has been logged with reference {{incidentId}}. Please note the AMC/support contract for serial number {{serialNumber}} has expired — our team will reach out regarding renewal along with resolving this request.\n\nRegards,\nSupport Team'

const DEFAULT_NOT_SUPPORTED_TEMPLATE =
  'Hi {{name}},\n\nThank you for reaching out. We could not find serial number {{serialNumber}} under our AMC/support coverage, so no incident has been created. Please contact our sales team for support options.\n\nRegards,\nSupport Team'

const EmailSettings = () => {
  const templateTabs = [
    {
      key: 'ack',
      label: 'Acknowledgement',
      description:
        "Sent when the incoming email already references an existing case ID (a reply to an open incident) — no new incident is created, and the Sales Team is not cc'd.",
      placeholders: ['{{name}}', '{{incidentId}}'],
    },
    {
      key: 'newTicket',
      label: 'New Ticket (Active)',
      description:
        "Sent when a new incident is created for a serial number with an active AMC/support contract. Sales Team is cc'd.",
      placeholders: ['{{name}}', '{{incidentId}}', '{{serialNumber}}'],
    },
    {
      key: 'expiredTicket',
      label: 'New Ticket (Expired)',
      description:
        "Sent when a new incident is created for a serial number whose linked Purchase Order has expired. Sales Team is cc'd.",
      placeholders: ['{{name}}', '{{incidentId}}', '{{serialNumber}}'],
    },
    {
      key: 'notSupported',
      label: 'Not Under Support',
      description:
        "Sent when no serial number in the email matches our inventory — no incident is created. Sales Team is still cc'd.",
      placeholders: ['{{name}}', '{{serialNumber}}'],
    },
  ]

  const details = getUserDetails()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [supportEmail, setSupportEmail] = useState('')
  const [gmailConfigured, setGmailConfigured] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true)
  const [ackTemplate, setAckTemplate] = useState(DEFAULT_ACK_TEMPLATE)
  const [newTicketTemplate, setNewTicketTemplate] = useState(DEFAULT_NEW_TICKET_TEMPLATE)
  const [expiredTicketTemplate, setExpiredTicketTemplate] = useState(DEFAULT_EXPIRED_TICKET_TEMPLATE)
  const [notSupportedTemplate, setNotSupportedTemplate] = useState(DEFAULT_NOT_SUPPORTED_TEMPLATE)
  const [dlList, setDlList] = useState([])
  const [dlInput, setDlInput] = useState('')
  const [activeTemplateTab, setActiveTemplateTab] = useState('ack')

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
      const response = await fetch(apiUrl + '/auth/comms/email-settings/get', requestOptions)
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setSupportEmail(data.supportEmail || '')
          setGmailConfigured(!!data.gmailConfigured)
          setEnabled(!!data.enabled)
          setAutoReplyEnabled(data.autoReplyEnabled ?? true)
          setAckTemplate(data.ackTemplate || DEFAULT_ACK_TEMPLATE)
          setNewTicketTemplate(data.newTicketTemplate || DEFAULT_NEW_TICKET_TEMPLATE)
          setExpiredTicketTemplate(data.expiredTicketTemplate || DEFAULT_EXPIRED_TICKET_TEMPLATE)
          setNotSupportedTemplate(data.notSupportedTemplate || DEFAULT_NOT_SUPPORTED_TEMPLATE)
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
      body: JSON.stringify({
        enabled,
        autoReplyEnabled,
        ackTemplate,
        newTicketTemplate,
        expiredTicketTemplate,
        notSupportedTemplate,
        dlList,
      }),
      redirect: 'follow',
    }

    try {
      const response = await fetch(apiUrl + '/auth/comms/email-settings/save', requestOptions)
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
            {gmailConfigured ? 'Mailbox connection configured' : 'Mailbox is not configured yet'}
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
          <label className={styles.formLabel}>Auto-reply templates</label>

          <div
            style={{
              display: 'flex',
              gap: 4,
              borderBottom: '1px solid var(--fc-border, #e6e9ef)',
              marginBottom: 12,
              flexWrap: 'wrap',
            }}
          >
            {templateTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTemplateTab(tab.key)}
                style={{
                  padding: '8px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  background: 'transparent',
                  border: 'none',
                  borderBottom:
                    activeTemplateTab === tab.key
                      ? '2px solid var(--fc-accent, #1752a6)'
                      : '2px solid transparent',
                  color:
                    activeTemplateTab === tab.key
                      ? 'var(--fc-accent, #1752a6)'
                      : 'var(--fc-ink-muted, #64748b)',
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {templateTabs
            .filter((tab) => tab.key === activeTemplateTab)
            .map((tab) => {
              const templateValue = {
                ack: ackTemplate,
                newTicket: newTicketTemplate,
                expiredTicket: expiredTicketTemplate,
                notSupported: notSupportedTemplate,
              }[tab.key]
              const templateSetter = {
                ack: setAckTemplate,
                newTicket: setNewTicketTemplate,
                expiredTicket: setExpiredTicketTemplate,
                notSupported: setNotSupportedTemplate,
              }[tab.key]

              return (
                <div key={tab.key}>
                  <p style={{ fontSize: 12, color: 'var(--fc-ink-muted)', margin: '0 0 6px' }}>
                    {tab.description}
                  </p>
                  <textarea
                    className={styles.formInput}
                    rows={7}
                    value={templateValue}
                    onChange={(e) => templateSetter(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--fc-ink-muted)', marginTop: 4 }}>
                    Use{' '}
                    {tab.placeholders.map((p, i) => (
                      <React.Fragment key={p}>
                        <code>{p}</code>
                        {i < tab.placeholders.length - 1 ? ', ' : ''}
                      </React.Fragment>
                    ))}{' '}
                    as placeholders.
                  </span>
                </div>
              )
            })}
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
