import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { createSurveyTemplate, editSurveyTemplate } from '@/api/survey_api'
import SurveyTemplateModal from './SurveyTemplateModal'
import styles from '../itil/itil.module.scss'

const Survey = () => {
  const router = useRouter()
  const details = getUserDetails()
  const [templates, setTemplates] = useState({})
  const [reports, setReports] = useState({})
  const [showCreate, setShowCreate] = useState(false)

  const canManage = details?.roles?.includes('ROLE_ADMIN') || details?.roles?.includes('ROLE_MODERATOR')

  const getAll = async () => {
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    try {
      const response = await fetch(apiUrl + '/auth/survey/template-get-all-page?page=0&size=50', {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      })
      if (response.status === 401) {
        router.push('/')
        return
      }
      const data = await response.json()
      setTemplates(data)
      ;(data.content || []).forEach((t) => getReport(t.id))
    } catch (error) {
      console.error('Error fetching survey templates:', error)
    }
  }

  const getReport = async (templateId) => {
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    try {
      const response = await fetch(apiUrl + '/auth/survey/report?templateId=' + templateId, {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      })
      if (!response.ok) return
      const data = await response.json()
      setReports((prev) => ({ ...prev, [templateId]: data }))
    } catch (error) {
      console.error('Error fetching survey report:', error)
    }
  }

  const handleCreate = (values) => {
    createSurveyTemplate(values, router, () => {
      setShowCreate(false)
      getAll()
    })
  }

  const toggleActive = (t) => {
    editSurveyTemplate({ id: t.id, active: !t.active }, router, getAll)
  }

  useEffect(() => {
    getAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Surveys</h1>
          <p className={styles.pageSubtitle}>Customer satisfaction survey templates and results</p>
        </div>
        {canManage && (
          <button type="button" className={styles.addBtn} onClick={() => setShowCreate(true)}>
            + New Survey
          </button>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Survey</th>
                <th>Title</th>
                <th>Questions</th>
                <th>Send Delay</th>
                <th>Status</th>
                <th>Response Rate</th>
                <th>Avg. Satisfaction</th>
                {canManage && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {templates.content?.map((t) => {
                const r = reports[t.id]
                return (
                  <tr key={t.id}>
                    <td className={styles.email}>{t.templateId}</td>
                    <td>{t.title}</td>
                    <td className={styles.email}>{t.questions.length}</td>
                    <td className={styles.email}>{t.triggerDelayHours}h</td>
                    <td>
                      <span className={t.active ? styles.statusSuccess : styles.statusNeutral}>
                        {t.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className={styles.email}>{r ? `${r.responseRate}%` : '—'}</td>
                    <td className={styles.email}>{r?.averageSatisfaction ?? '—'}</td>
                    {canManage && (
                      <td>
                        <button type="button" className={styles.editBtn} onClick={() => toggleActive(t)}>
                          {t.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
          {templates.content?.length === 0 && <div className={styles.emptyState}>No survey templates yet</div>}
        </div>
      </div>

      {showCreate && <SurveyTemplateModal onClose={() => setShowCreate(false)} onSubmit={handleCreate} />}
    </div>
  )
}

export default Survey
