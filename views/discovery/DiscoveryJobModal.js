import React, { useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { apiUrl, tenant } from '@/lib/config'
import styles from '../itil/itil.module.scss'

const DiscoveryJobModal = ({ onClose, onSubmit }) => {
  const [created, setCreated] = useState(null)

  const formik = useFormik({
    initialValues: { name: '', cidr: '', schedule: 'Every 24 hours' },
    validationSchema: Yup.object({
      name: Yup.string().max(100).required('Required'),
      cidr: Yup.string()
        .matches(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/, 'Must look like 192.168.1.0/24')
        .required('Required'),
      schedule: Yup.string().required('Required'),
    }),
    onSubmit: (values) => {
      onSubmit(values, (data) => setCreated({ jobId: data.id, agentToken: data.agentToken }))
    },
  })

  if (created) {
    const curlSample = `curl -X POST "${apiUrl}/auth/discovery/report?jobId=${created.jobId}" \\\n  -H "X-Tenant: ${tenant}" \\\n  -H "X-Agent-Token: ${created.agentToken}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"devices":[{"ip":"192.168.1.10","hostname":"host1","mac":"AA:BB:CC:00:11:22","deviceType":"SERVER"}]}'`
    return (
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>Discovery Job Created</h2>
            <button type="button" className={styles.modalClose} onClick={onClose}>
              &times;
            </button>
          </div>
          <div className={styles.modalBody}>
            <p className={styles.detailSectionBody} style={{ marginBottom: 12 }}>
              Save this agent token now — it will not be shown again. Point your on-prem scanner
              agent at the endpoint below to report discovered devices into this job.
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
          <h2 className={styles.modalTitle}>New Discovery Job</h2>
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
                  placeholder="e.g. Head Office Scan"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.name && formik.errors.name && (
                  <span className={styles.formFeedbackInvalid}>{formik.errors.name}</span>
                )}
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>CIDR</label>
                <input
                  type="text"
                  className={styles.formInput}
                  name="cidr"
                  placeholder="192.168.1.0/24"
                  value={formik.values.cidr}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.cidr && formik.errors.cidr && (
                  <span className={styles.formFeedbackInvalid}>{formik.errors.cidr}</span>
                )}
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Schedule</label>
                <input
                  type="text"
                  className={styles.formInput}
                  name="schedule"
                  placeholder="Every 24 hours"
                  value={formik.values.schedule}
                  onChange={formik.handleChange}
                />
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

export default DiscoveryJobModal
