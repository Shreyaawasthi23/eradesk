import React, { useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { apiUrl, tenant } from '@/lib/config'
import styles from '../itil/itil.module.scss'

const MonitoringModal = ({ onClose, onSubmit }) => {
  const [created, setCreated] = useState(null)

  const formik = useFormik({
    initialValues: { name: '', defaultWorkGroup: '', defaultPriority: 3 },
    validationSchema: Yup.object({
      name: Yup.string().max(100).required('Required'),
    }),
    onSubmit: (values) => {
      onSubmit({ ...values, defaultPriority: Number(values.defaultPriority) }, (data) =>
        setCreated({ id: data.id, webhookToken: data.webhookToken }),
      )
    },
  })

  if (created) {
    const curlSample = `curl -X POST "${apiUrl}/api/public/monitoring/events?integrationId=${created.id}" \\\n  -H "X-Tenant: ${tenant}" \\\n  -H "X-Webhook-Token: ${created.webhookToken}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"alertId":"srv-01-down","title":"Server DOWN","description":"Health check failing","source":"Datadog"}'`
    return (
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>Monitoring Integration Created</h2>
            <button type="button" className={styles.modalClose} onClick={onClose}>
              &times;
            </button>
          </div>
          <div className={styles.modalBody}>
            <p className={styles.detailSectionBody} style={{ marginBottom: 12 }}>
              Save this webhook token now — it will not be shown again. Point your monitoring
              system (Datadog, Nagios, Zabbix, etc.) at this endpoint to auto-create incidents.
            </p>
            <pre
              style={{
                background: '#0f172a',
                color: '#e2e8f0',
                padding: 16,
                borderRadius: 8,
                fontSize: 12,
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              {curlSample}
            </pre>
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.submitBtn} onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>New Monitoring Integration</h2>
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
                  placeholder="e.g. Datadog, Nagios, Zabbix"
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
                <label className={styles.formLabel}>Default Work Group</label>
                <input
                  type="text"
                  className={styles.formInput}
                  name="defaultWorkGroup"
                  value={formik.values.defaultWorkGroup}
                  onChange={formik.handleChange}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Default Priority</label>
                <select className={styles.formInput} name="defaultPriority" value={formik.values.defaultPriority} onChange={formik.handleChange}>
                  {[1, 2, 3, 4, 5].map((p) => (
                    <option key={p} value={p}>
                      P{p}
                    </option>
                  ))}
                </select>
              </div>
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

export default MonitoringModal
