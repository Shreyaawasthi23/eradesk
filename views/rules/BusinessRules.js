import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { createBusinessRule, editBusinessRule } from '@/api/rules_api'
import RuleModal from './RuleModal'
import styles from '../itil/itil.module.scss'

const BusinessRules = () => {
  const router = useRouter()
  const details = getUserDetails()
  const [rules, setRules] = useState({})
  const [showCreate, setShowCreate] = useState(false)

  const isAdmin = details?.roles?.includes('ROLE_ADMIN')

  const getAll = async () => {
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    try {
      const response = await fetch(apiUrl + '/auth/ops/rules/get-all-page?page=0&size=50', {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      })
      if (response.status === 401) {
        router.push('/')
        return
      }
      const data = await response.json()
      setRules(data)
    } catch (error) {
      console.error('Error fetching business rules:', error)
    }
  }

  const handleCreate = (values) => {
    createBusinessRule(values, router, () => {
      setShowCreate(false)
      getAll()
    })
  }

  const toggleEnabled = (rule) => {
    editBusinessRule({ id: rule.id, enabled: !rule.enabled }, router, getAll)
  }

  useEffect(() => {
    getAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Business Rules</h1>
          <p className={styles.pageSubtitle}>Automated conditions and actions across modules</p>
        </div>
        {isAdmin && (
          <button type="button" className={styles.addBtn} onClick={() => setShowCreate(true)}>
            + New Rule
          </button>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Rule</th>
                <th>Name</th>
                <th>Entity</th>
                <th>Trigger</th>
                <th>Priority</th>
                <th>Status</th>
                {isAdmin && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {rules.content?.map((r) => (
                <tr key={r.id}>
                  <td className={styles.email}>{r.ruleId}</td>
                  <td>{r.name}</td>
                  <td>
                    <span className={styles.typeBadge}>{r.entityType}</span>
                  </td>
                  <td className={styles.email}>{r.trigger.replace('_', ' ')}</td>
                  <td className={styles.email}>{r.priority}</td>
                  <td>
                    <span className={r.enabled ? styles.statusSuccess : styles.statusNeutral}>
                      {r.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td>
                      <button type="button" className={styles.editBtn} onClick={() => toggleEnabled(r)}>
                        {r.enabled ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {rules.content?.length === 0 && <div className={styles.emptyState}>No business rules configured</div>}
        </div>
      </div>

      {showCreate && <RuleModal onClose={() => setShowCreate(false)} onSubmit={handleCreate} />}
    </div>
  )
}

export default BusinessRules
