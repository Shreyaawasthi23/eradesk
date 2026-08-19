/* eslint-disable react/prop-types */
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import moment from 'moment'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import Edit_Rma from '@/components/model/Edit_Rma'
import New_Challan from '@/components/model/New_Challan'
import Rma_Purchase from '@/components/model/Rma_Purchase'
import Edit_Rma_Purchase from '@/components/model/Edit_RMA_Purchase'

import styles from './rma.module.scss'

const statusColor = (status) => {
  if (status === 'CLOSED') return { bg: 'rgba(0, 200, 83, 0.14)', fg: '#0f9d58' }
  if (status === 'CANCELED') return { bg: 'rgba(220, 38, 38, 0.14)', fg: '#dc2626' }
  if (status === 'WAITING FOR FAULTY RETURN') return { bg: 'rgba(37, 99, 235, 0.14)', fg: '#2563eb' }
  return { bg: 'rgba(202, 138, 4, 0.16)', fg: '#a16207' }
}

const InfoField = ({ label, value }) => (
  <div className={styles.infoField}>
    <span className={styles.infoLabel}>{label}</span>
    {value ? (
      <span className={styles.infoValue}>{value}</span>
    ) : (
      <span className={styles.infoValueEmpty}>Not provided</span>
    )}
  </div>
)

const View_RMA = () => {
  const router = useRouter()
  const { id } = router.query
  const [mounted, setMounted] = useState(false)
  const details = mounted ? getUserDetails() : null
  const [rmaDetails, setRmaDetails] = useState({})
  const [editRmaVisible, setEditRmaVisiable] = useState(false)

  const [visibilityChallan, setVisibilityChallan] = useState(false)
  const [rmaDetailsForChallan, setRmaDetailsForChallan] = useState({})

  const [visibilityRmaPurchase, setVisibilityRmaPurchase] = useState(false)
  const [rmaDetailsForPurchase, setRmaDetailsForPurchase] = useState({})

  const [rmaPurchase, setRmaPurchase] = useState({})

  const [rmaPurchaseDetails, setRmaPurchaseDetails] = useState({})
  const [editRmaPurchaseVisible, setEditRmaPurchaseVisiable] = useState(false)

  const canManage = details?.roles?.includes('ROLE_ADMIN') || details?.roles?.includes('ROLE_USER')

  const formatDate = (date) => (date ? moment(date).format('DD/MM/YYYY') : '')
  const formatTime = (date) => (date ? moment(date).format('hh:mm A') : '')
  const formatDateTime = (date) => (date ? `${formatDate(date)} · ${formatTime(date)}` : '')

  const openChallan = () => {
    setVisibilityChallan(true)
    setRmaDetailsForChallan(rmaDetails)
  }

  const openPurchase = () => {
    setVisibilityRmaPurchase(true)
    setRmaDetailsForPurchase(rmaDetails)
  }

  const getRmaDetails = async () => {
    try {
      const myHeaders = new Headers()
      myHeaders.append('X-Tenant', '' + tenant + '')
      myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

      const requestOptions = {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      }

      const response = await fetch(apiUrl + '/auth/rma/details?id=' + id, requestOptions)

      if (response.status === 401) {
        router.push('/')
      } else {
        const result = await response.json()
        if (result !== null) {
          setRmaDetails(result)
        }
      }
    } catch (error) {
      console.log('error', error)
    }
  }

  const getRmaPurchases = async () => {
    try {
      const myHeaders = new Headers()
      myHeaders.append('X-Tenant', '' + tenant + '')
      myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

      const requestOptions = {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      }

      const response = await fetch(
        apiUrl + '/auth/rma/get-purchase-by-rma?page=0&size=100&rmaId=' + id + '',
        requestOptions,
      )

      if (response.status === 401) {
        router.push('/')
      } else {
        const result = await response.json()
        if (result !== null) {
          setRmaPurchase(result)
        }
      }
    } catch (error) {
      console.log('error', error)
    }
  }

  const handelEditRmaPurchase = (option) => {
    setEditRmaPurchaseVisiable(true)
    setRmaPurchaseDetails(option)
  }

  const handelEditRma = () => {
    setEditRmaVisiable(true)
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !id) return
    getRmaDetails()
    getRmaPurchases()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, id])

  const color = statusColor(rmaDetails.status)

  return (
    <div className={styles.page}>
      <div className={styles.detailHeader}>
        <div>
          <div className={styles.detailTitleRow}>
            <h1 className={styles.detailId}>#{rmaDetails.rmaId}</h1>
            {rmaDetails.status && (
              <span className={styles.statusBadge} style={{ background: color.bg, color: color.fg }}>
                {rmaDetails.status}
              </span>
            )}
          </div>
          <p className={styles.detailMeta}>
            Raised On <b>{formatDate(rmaDetails.createDate)}</b> at{' '}
            <b>{formatTime(rmaDetails.createDate)}</b>
            {rmaDetails.userEmail && (
              <>
                {' '}
                by <b>{rmaDetails.userEmail}</b>
              </>
            )}
          </p>
        </div>
        {canManage && (
          <div className={styles.detailActions}>
            <button type="button" className={styles.filterClear} onClick={openChallan}>
              Create Challan
            </button>
            <button type="button" className={styles.addBtn} onClick={handelEditRma}>
              Edit RMA
            </button>
          </div>
        )}
      </div>

      <div className={styles.sectionGrid}>
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Asset Details</h2>
          <div className={styles.infoGrid}>
            <InfoField label="Incident #" value={rmaDetails.incidentId} />
            <InfoField label="Make" value={rmaDetails.make} />
            <InfoField label="Model" value={rmaDetails.model} />
            <InfoField label="Serial #" value={rmaDetails.serialNo} />
          </div>
        </div>
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>End Client Details</h2>
          <div className={styles.infoGrid}>
            <InfoField label="Client Name" value={rmaDetails.endClientName} />
            <InfoField label="Contact Person" value={rmaDetails.contactName} />
            <InfoField label="Contact No." value={rmaDetails.contactNumber} />
            <InfoField label="Contact Email" value={rmaDetails.contactEmail} />
          </div>
        </div>
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Location Details</h2>
          <div className={styles.infoGrid}>
            <InfoField label="Full Address" value={rmaDetails.fullAddress} />
            <InfoField label="City" value={rmaDetails.city} />
            <InfoField label="State" value={rmaDetails.state} />
            <InfoField label="Pincode" value={rmaDetails.pinCode} />
          </div>
        </div>
      </div>

      <div className={styles.card} style={{ padding: '18px 20px', marginBottom: 16 }}>
        <h2 className={styles.sectionTitle}>Part Details</h2>
        <div className={styles.detailSectionGrid}>
          <InfoField label="Part No. / Alternative Part No." value={rmaDetails.partNumber} />
          <InfoField label="Description" value={rmaDetails.description} />
          <InfoField label="Quantity" value={rmaDetails.quantity} />
          <InfoField label="PO Number" value={rmaDetails.purchaseOrderNumber} />
          <InfoField label="Status" value={rmaDetails.status} />
          <InfoField label="Incident Id" value={rmaDetails.incidentId} />
        </div>
      </div>

      {details?.roles?.includes('ROLE_ADMIN') && (
        <div className={styles.card}>
          <div className={styles.pageHeader} style={{ padding: '16px 20px', marginBottom: 0 }}>
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
              Purchase Details
            </h2>
            <button type="button" className={styles.addBtn} onClick={openPurchase}>
              + Add New Purchase
            </button>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Incident ID</th>
                  <th>End Client</th>
                  <th>Create Date</th>
                  <th>Quantity</th>
                  <th>Total Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rmaPurchase.content?.map((option) => (
                  <tr key={option.id}>
                    <td className={styles.incidentIdCell}>{option.incidentId}</td>
                    <td className={styles.email}>{option.endClientName}</td>
                    <td className={styles.email}>{formatDateTime(option.createDate)}</td>
                    <td className={styles.email}>{option.quantity}</td>
                    <td className={styles.email}>{option.totalAmount}</td>
                    <td>
                      <button
                        type="button"
                        className={styles.editBtn}
                        onClick={() => handelEditRmaPurchase(option)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rmaPurchase.content?.length === 0 && (
              <div className={styles.emptyState}>No purchases linked to this RMA</div>
            )}
          </div>
        </div>
      )}

      <Edit_Rma
        visible={editRmaVisible}
        setVisible={setEditRmaVisiable}
        rmaDetails={rmaDetails}
        setRmaDetails={setRmaDetails}
        onSuccess={getRmaDetails}
      />
      <Edit_Rma_Purchase
        visible={editRmaPurchaseVisible}
        setVisible={setEditRmaPurchaseVisiable}
        rmaPurchaseDetails={rmaPurchaseDetails}
        setRmaDetails={setRmaDetails}
      />
      <New_Challan
        visible={visibilityChallan}
        setVisible={setVisibilityChallan}
        rma={rmaDetailsForChallan}
      />
      <Rma_Purchase
        visible={visibilityRmaPurchase}
        setVisible={setVisibilityRmaPurchase}
        rma={rmaDetailsForPurchase}
      />
    </div>
  )
}

export default View_RMA
