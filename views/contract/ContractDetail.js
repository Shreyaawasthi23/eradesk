import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { setContractStatus } from '@/apiClients/contract_api'
import styles from '../itil/itil.module.scss'

const statusClass = { ACTIVE: 'statusSuccess', RENEWED: 'statusInfo', EXPIRED: 'statusDanger', TERMINATED: 'statusNeutral' }

const ContractDetail = () => {
  const router = useRouter()
  const { id } = router.query
  const details = getUserDetails()
  const [contract, setContract] = useState(null)

  const canManage =
    details?.roles?.includes('ROLE_ADMIN') ||
    details?.roles?.includes('ROLE_USER') ||
    details?.roles?.includes('ROLE_MODERATOR')

  const getDetail = async () => {
    if (!id) return
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    try {
      const response = await fetch(apiUrl + '/auth/service/contract/get-detail?id=' + id, {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      })
      if (response.status === 401) {
        router.push('/')
        return
      }
      if (response.status === 404) {
        setContract(null)
        return
      }
      const data = await response.json()
      setContract(data)
    } catch (error) {
      console.error('Error fetching contract:', error)
    }
  }

  const transition = (status) => setContractStatus(id, status, router, getDetail)

  useEffect(() => {
    getDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!contract) {
    return (
      <div className={styles.page}>
        <span className={styles.backLink} onClick={() => router.push('/contract')}>
          &larr; Back to Contracts
        </span>
        <div className={styles.detailCard}>
          <div className={styles.emptyState}>Loading contract...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <span className={styles.backLink} onClick={() => router.push('/contract')}>
        &larr; Back to Contracts
      </span>

      <div className={styles.detailLayout}>
        <div>
          <div className={styles.detailCard}>
            <div className={styles.detailMeta}>
              <span className={styles[statusClass[contract.status] || 'statusNeutral']}>{contract.status}</span>
              <span className={styles.typeBadge}>{contract.type}</span>
            </div>
            <h1 className={styles.detailTitle}>
              {contract.contractId}: {contract.vendorName}
            </h1>
            <div className={styles.detailSection}>
              <p className={styles.detailSectionLabel}>Description</p>
              <div className={styles.detailSectionBody}>{contract.description || '—'}</div>
            </div>
            <div className={styles.detailSection}>
              <p className={styles.detailSectionLabel}>Term</p>
              <div className={styles.detailSectionBody}>
                {new Date(contract.startDate).toLocaleDateString()} &rarr; {new Date(contract.endDate).toLocaleDateString()}
                {contract.renewalDate && ` (renewal: ${new Date(contract.renewalDate).toLocaleDateString()})`}
              </div>
            </div>
            {contract.cost != null && (
              <div className={styles.detailSection}>
                <p className={styles.detailSectionLabel}>Cost</p>
                <div className={styles.detailSectionBody}>₹{contract.cost.toLocaleString()}</div>
              </div>
            )}
          </div>
        </div>

        <div>
          {contract.vendor && (
            <div className={styles.sidePanel} style={{ marginBottom: 16 }}>
              <p className={styles.sidePanelTitle}>Vendor</p>
              <div className={styles.detailSectionBody}>
                <div>{contract.vendor.name}</div>
                {contract.vendor.contactPerson && <div>{contract.vendor.contactPerson}</div>}
                {contract.vendor.email && (
                  <div>
                    <a href={`mailto:${contract.vendor.email}`}>{contract.vendor.email}</a>
                  </div>
                )}
                {contract.vendor.phone && (
                  <div>
                    <a href={`tel:${contract.vendor.phone}`}>{contract.vendor.phone}</a>
                  </div>
                )}
              </div>
            </div>
          )}

          {canManage && !['EXPIRED', 'TERMINATED'].includes(contract.status) && (
            <div className={styles.sidePanel} style={{ marginBottom: 16 }}>
              <p className={styles.sidePanelTitle}>Actions</p>
              <div className={styles.actionBtnRow}>
                <button type="button" className={styles.actionBtn} onClick={() => transition('RENEWED')}>
                  Mark Renewed
                </button>
                <button type="button" className={styles.actionBtnDanger} onClick={() => transition('TERMINATED')}>
                  Terminate
                </button>
              </div>
            </div>
          )}

          <div className={styles.sidePanel}>
            <p className={styles.sidePanelTitle}>Linked Assets ({contract.linkedAssets?.length || 0})</p>
            <div className={styles.chipList}>
              {(contract.linkedAssets || []).map((a) => (
                <div key={a.id} className={styles.chip} style={{ cursor: 'default' }}>
                  <span className={styles.chipTitle}>
                    {a.make} {a.model} — {a.serialNumber}
                  </span>
                </div>
              ))}
              {(!contract.linkedAssets || contract.linkedAssets.length === 0) && (
                <span className={styles.email}>None linked</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContractDetail
