import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Swal from 'sweetalert2'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { createLicense, installSoftware, uninstallSoftware } from '@/api/software_api'
import styles from '../itil/itil.module.scss'

const SoftwareDetail = () => {
  const router = useRouter()
  const { id } = router.query
  const details = getUserDetails()
  const [software, setSoftware] = useState(null)

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
      const response = await fetch(apiUrl + '/auth/software/get-detail?id=' + id, {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      })
      if (response.status === 401) {
        router.push('/')
        return
      }
      if (response.status === 404) {
        setSoftware(null)
        return
      }
      const data = await response.json()
      setSoftware(data)
    } catch (error) {
      console.error('Error fetching software:', error)
    }
  }

  const addLicense = () => {
    Swal.fire({
      title: 'New License',
      html:
        '<input id="swal-key" class="swal2-input" placeholder="License key (optional)">' +
        '<input id="swal-seats" class="swal2-input" type="number" min="1" placeholder="Total seats">' +
        '<input id="swal-vendor" class="swal2-input" placeholder="Vendor">' +
        '<input id="swal-cost" class="swal2-input" type="number" placeholder="Cost">' +
        '<input id="swal-expiry" class="swal2-input" type="date" placeholder="Expiry date">',
      showCancelButton: true,
      confirmButtonText: 'Create License',
      preConfirm: () => {
        const seats = document.getElementById('swal-seats').value
        if (!seats || Number(seats) < 1) {
          Swal.showValidationMessage('Total seats is required')
          return false
        }
        return {
          licenseKey: document.getElementById('swal-key').value,
          totalSeats: Number(seats),
          vendor: document.getElementById('swal-vendor').value,
          cost: document.getElementById('swal-cost').value || null,
          expiryDate: document.getElementById('swal-expiry').value || null,
        }
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        createLicense({ softwareId: id, ...result.value }, router, getDetail)
      }
    })
  }

  const install = (licenseId) => {
    Swal.fire({
      title: 'Install',
      input: 'text',
      inputPlaceholder: 'Device label (e.g. laptop-jane)',
      showCancelButton: true,
      confirmButtonText: 'Install',
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        installSoftware(licenseId, { deviceLabel: result.value }, router, getDetail)
      }
    })
  }

  const uninstall = (installationId) => {
    uninstallSoftware(installationId, router, getDetail)
  }

  useEffect(() => {
    getDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!software) {
    return (
      <div className={styles.page}>
        <span className={styles.backLink} onClick={() => router.push('/software')}>
          &larr; Back to Software
        </span>
        <div className={styles.detailCard}>
          <div className={styles.emptyState}>Loading software...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <span className={styles.backLink} onClick={() => router.push('/software')}>
        &larr; Back to Software
      </span>

      <div className={styles.detailLayout}>
        <div>
          <div className={styles.detailCard}>
            <div className={styles.detailMeta}>
              <span className={styles.typeBadge}>{software.category}</span>
              {software.compliance.overAllocated && <span className={styles.statusDanger}>OVER-ALLOCATED</span>}
            </div>
            <h1 className={styles.detailTitle}>
              {software.softwareId}: {software.name}
            </h1>
            <div className={styles.detailSection}>
              <p className={styles.detailSectionLabel}>Publisher</p>
              <div className={styles.detailSectionBody}>{software.publisher || '—'}</div>
            </div>

            <div className={styles.detailSection}>
              <p className={styles.detailSectionLabel}>
                Licenses ({software.licenses.length}) {canManage && (
                  <button type="button" className={styles.editBtn} style={{ marginLeft: 8 }} onClick={addLicense}>
                    + New License
                  </button>
                )}
              </p>
              {software.licenses.map((l) => (
                <div key={l.id} className={styles.timelineItem} style={{ marginBottom: 8 }}>
                  <div className={styles.timelineHead}>
                    <span>{l.licenseId}</span>
                    <span className={styles.email}>
                      {l.usedSeats}/{l.totalSeats} seats
                    </span>
                  </div>
                  <div className={styles.timelineMeta}>
                    {l.vendor && `Vendor: ${l.vendor} · `}
                    {l.expiryDate ? `Expires ${new Date(l.expiryDate).toLocaleDateString()}` : 'No expiry'}
                  </div>
                  {canManage && l.usedSeats < l.totalSeats && (
                    <button type="button" className={styles.editBtn} style={{ marginTop: 8 }} onClick={() => install(l.id)}>
                      Install
                    </button>
                  )}
                </div>
              ))}
              {software.licenses.length === 0 && <span className={styles.email}>No licenses yet</span>}
            </div>
          </div>
        </div>

        <div>
          <div className={styles.sidePanel} style={{ marginBottom: 16 }}>
            <p className={styles.sidePanelTitle}>Compliance</p>
            <div className={styles.detailSectionBody}>
              <div>Total seats: {software.compliance.totalSeats}</div>
              <div>Used: {software.compliance.usedSeats}</div>
              <div>Available: {software.compliance.availableSeats}</div>
            </div>
          </div>

          <div className={styles.sidePanel}>
            <p className={styles.sidePanelTitle}>Installations ({software.installations.length})</p>
            <div className={styles.chipList}>
              {software.installations.map((i) => (
                <div key={i.id} className={styles.chip} style={{ cursor: 'default' }}>
                  <span className={styles.chipTitle}>{i.deviceLabel}</span>
                  {canManage && (
                    <button type="button" className={styles.editBtn} onClick={() => uninstall(i.id)}>
                      Uninstall
                    </button>
                  )}
                </div>
              ))}
              {software.installations.length === 0 && <span className={styles.email}>No installations</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SoftwareDetail
