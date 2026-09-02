import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Swal from 'sweetalert2'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { setBusinessHours, createHoliday, deleteHoliday, createSlaPolicy } from '@/api/sla_api'
import styles from '../itil/itil.module.scss'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const toHHMM = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
const fromHHMM = (str) => {
  const [h, m] = str.split(':').map(Number)
  return h * 60 + m
}

const SlaConfig = () => {
  const router = useRouter()
  const details = getUserDetails()
  const [businessHours, setBH] = useState({ workDays: [1, 2, 3, 4, 5], startMinute: 540, endMinute: 1080 })
  const [holidays, setHolidays] = useState([])
  const [policies, setPolicies] = useState([])

  const isAdmin = details?.roles?.includes('ROLE_ADMIN')
  const canManagePolicy = isAdmin || details?.roles?.includes('ROLE_MODERATOR')

  const authFetch = (path) => {
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    return fetch(apiUrl + path, { method: 'GET', headers: myHeaders, redirect: 'follow' })
  }

  const getBusinessHours = async () => {
    const r = await authFetch('/auth/ops/sla/business-hours-get')
    if (r.status === 401) return router.push('/')
    setBH(await r.json())
  }

  const getHolidays = async () => {
    const r = await authFetch('/auth/ops/sla/holiday-get-all')
    if (r.status === 401) return router.push('/')
    setHolidays(await r.json())
  }

  const getPolicies = async () => {
    const r = await authFetch('/auth/ops/sla/policy-get-all')
    if (r.status === 401) return router.push('/')
    setPolicies(await r.json())
  }

  const toggleDay = (day) => {
    setBH((prev) => ({
      ...prev,
      workDays: prev.workDays.includes(day) ? prev.workDays.filter((d) => d !== day) : [...prev.workDays, day].sort(),
    }))
  }

  const saveBusinessHours = () => setBusinessHours(businessHours, router, getBusinessHours)

  const addHoliday = () => {
    Swal.fire({
      title: 'Add Holiday',
      html: '<input id="swal-date" type="date" class="swal2-input"><input id="swal-name" class="swal2-input" placeholder="Holiday name">',
      showCancelButton: true,
      confirmButtonText: 'Add',
      preConfirm: () => {
        const date = document.getElementById('swal-date').value
        const name = document.getElementById('swal-name').value
        if (!date) {
          Swal.showValidationMessage('Date is required')
          return false
        }
        return { date, name }
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        createHoliday(result.value, router, getHolidays)
      }
    })
  }

  const removeHoliday = (id) => deleteHoliday(id, router, getHolidays)

  const addPolicy = () => {
    Swal.fire({
      title: 'New SLA Policy',
      html:
        '<input id="swal-name" class="swal2-input" placeholder="Policy name">' +
        '<select id="swal-entity" class="swal2-select"><option value="Incident">Incident</option><option value="Problem">Problem</option><option value="Change">Change</option></select>' +
        '<input id="swal-priority" class="swal2-input" type="number" placeholder="Priority (1-5)">' +
        '<input id="swal-response" class="swal2-input" type="number" placeholder="Response (minutes)">' +
        '<input id="swal-resolution" class="swal2-input" type="number" placeholder="Resolution (minutes)">',
      showCancelButton: true,
      confirmButtonText: 'Create',
      preConfirm: () => {
        const name = document.getElementById('swal-name').value
        const entityType = document.getElementById('swal-entity').value
        const priority = Number(document.getElementById('swal-priority').value)
        const responseMinutes = Number(document.getElementById('swal-response').value)
        const resolutionMinutes = Number(document.getElementById('swal-resolution').value)
        if (!name || !priority || !responseMinutes || !resolutionMinutes) {
          Swal.showValidationMessage('All fields are required')
          return false
        }
        return { name, entityType, targets: [{ priority, responseMinutes, resolutionMinutes }] }
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        createSlaPolicy(result.value, router, getPolicies)
      }
    })
  }

  useEffect(() => {
    getBusinessHours()
    getHolidays()
    getPolicies()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>SLA Configuration</h1>
          <p className={styles.pageSubtitle}>Business hours, holidays, and SLA policies</p>
        </div>
      </div>

      <div className={styles.card} style={{ padding: 20, marginBottom: 16 }}>
        <p className={styles.detailSectionLabel}>Business Hours</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {DAY_NAMES.map((d, idx) => (
            <button
              key={d}
              type="button"
              className={businessHours.workDays.includes(idx) ? styles.applyBtn : styles.filterClear}
              onClick={() => isAdmin && toggleDay(idx)}
              disabled={!isAdmin}
            >
              {d}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label className={styles.filterLabel}>Start</label>
          <input
            type="time"
            className={styles.formInput}
            value={toHHMM(businessHours.startMinute)}
            onChange={(e) => setBH((prev) => ({ ...prev, startMinute: fromHHMM(e.target.value) }))}
            disabled={!isAdmin}
          />
          <label className={styles.filterLabel}>End</label>
          <input
            type="time"
            className={styles.formInput}
            value={toHHMM(businessHours.endMinute)}
            onChange={(e) => setBH((prev) => ({ ...prev, endMinute: fromHHMM(e.target.value) }))}
            disabled={!isAdmin}
          />
          {isAdmin && (
            <button type="button" className={styles.submitBtn} onClick={saveBusinessHours}>
              Save
            </button>
          )}
        </div>
      </div>

      <div className={styles.card} style={{ padding: 20, marginBottom: 16 }}>
        <p className={styles.detailSectionLabel}>
          Holidays {isAdmin && (
            <button type="button" className={styles.editBtn} style={{ marginLeft: 8 }} onClick={addHoliday}>
              + Add
            </button>
          )}
        </p>
        <div className={styles.chipList}>
          {holidays.map((h) => (
            <div key={h.id} className={styles.chip} style={{ cursor: 'default' }}>
              <span className={styles.chipTitle}>
                {h.date} {h.name && `— ${h.name}`}
              </span>
              {isAdmin && (
                <button type="button" className={styles.editBtn} onClick={() => removeHoliday(h.id)}>
                  Remove
                </button>
              )}
            </div>
          ))}
          {holidays.length === 0 && <span className={styles.email}>No holidays configured</span>}
        </div>
      </div>

      <div className={styles.card} style={{ padding: 20 }}>
        <p className={styles.detailSectionLabel}>
          SLA Policies {canManagePolicy && (
            <button type="button" className={styles.editBtn} style={{ marginLeft: 8 }} onClick={addPolicy}>
              + New Policy
            </button>
          )}
        </p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Policy</th>
                <th>Entity</th>
                <th>Targets</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id}>
                  <td className={styles.email}>{p.policyId}</td>
                  <td>{p.entityType}</td>
                  <td className={styles.email}>
                    {p.targets.map((t) => `P${t.priority}: ${t.responseMinutes}m/${t.resolutionMinutes}m`).join(', ')}
                  </td>
                  <td>
                    <span className={p.active ? styles.statusSuccess : styles.statusNeutral}>
                      {p.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {policies.length === 0 && <div className={styles.emptyState}>No SLA policies configured</div>}
        </div>
      </div>
    </div>
  )
}

export default SlaConfig
