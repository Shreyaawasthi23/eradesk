import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { UpdateRmaStatus } from '@/api/rma_api'
import RmaPod_Upload from '@/components/model/RmaPod_Upload'
import Pagination from '@/components/ui/Pagination'
import CappedSelect from '@/components/ui/CappedSelect'

import styles from './rma.module.scss'
import RmaActionsMenu from './RmaActionsMenu'

const statusOptions = ['PENDING', 'WAITING FOR FAULTY RETURN', 'CLOSED', 'CANCELED']

const getStatusColor = (status) => {
  if (status === 'CLOSED') return { bg: 'rgba(0, 200, 83, 0.14)', fg: '#0f9d58' }
  if (status === 'CANCELED') return { bg: 'rgba(220, 38, 38, 0.14)', fg: '#dc2626' }
  if (status === 'WAITING FOR FAULTY RETURN') return { bg: 'rgba(37, 99, 235, 0.14)', fg: '#2563eb' }
  return { bg: 'rgba(202, 138, 4, 0.16)', fg: '#a16207' }
}

const RMA_Status = () => {
  const router = useRouter()
  const { status } = router.query
  const details = getUserDetails()
  const [rmaList, setRmaList] = useState({})
  const [currentPage, setCurrentPage] = useState(0)

  const [podUploadVisiable, setPodUploadVisiabel] = useState(false)
  const [podRmaDetails, setPodRmaDetails] = useState({})
  const [existingPod, setExistingPod] = useState({})

  const getAllRma = async (page, size) => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    try {
      var response = await fetch(
        apiUrl +
          '/auth/core/rma/rma-by-status?page=' +
          page +
          '&size=' +
          size +
          '&status=' +
          status +
          '',
        requestOptions,
      )

      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setRmaList(data)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const gotToPage = (pageNo) => {
    getAllRma(pageNo, 5000)
    setCurrentPage(pageNo)
  }

  const handelIncidentClick = (incidentRefId) => {
    router.push('/edit-incident/view/' + incidentRefId)
  }

  const ViewRma = (rmaDetails) => {
    router.push(`/rma/view/${rmaDetails.id}`)
  }

  const handelRmaStatusUpdate = (e, rmaId) => {
    UpdateRmaStatus(e.target.value, rmaId, router, () => getAllRma(currentPage, 5000))
  }

  const handelExistingPod = async (option) => {
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
        apiUrl + '/auth/core/rma/get-rma-pod-details?id=' + option.id,
        requestOptions,
      )
      const result = await response.json()
      setExistingPod(result)
    } catch (error) {
      console.log('error', error)
    }
  }

  const handelPodUpload = (option) => {
    setPodRmaDetails(option)
    setPodUploadVisiabel(true)
    handelExistingPod(option)
  }

  useEffect(() => {
    if (!status) return
    getAllRma(0, 5000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>RMA Requests &middot; {status}</h1>
          <p className={styles.pageSubtitle}>RMA requests filtered by status</p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>RMA #</th>
                <th>Date</th>
                <th>Status</th>
                <th>Incident</th>
                <th>End Client</th>
                <th className={styles.actionHeader}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rmaList.content?.map((option) => {
                const color = getStatusColor(option.status)
                return (
                  <tr key={option.id}>
                    <td className={styles.incidentIdCell} onClick={() => ViewRma(option)}>
                      {option.rmaId}
                    </td>
                    <td className={styles.email}>{option.createDate}</td>
                    <td className={styles.statusCell}>
                      <CappedSelect
                        value={option.status || ''}
                        onChange={(e) => handelRmaStatusUpdate(e, option.id)}
                        options={statusOptions.map((s) => ({ value: s, label: s }))}
                      />
                    </td>
                    <td
                      className={styles.incidentIdCell}
                      onClick={() => handelIncidentClick(option.incidentRefId)}
                    >
                      {option.incidentId}
                    </td>
                    <td className={styles.email}>{option.endClientName}</td>
                    <td className={styles.actionCell}>
                      <RmaActionsMenu
                        canUploadPod={
                          details?.roles?.includes('ROLE_ADMIN') ||
                          details?.roles?.includes('ROLE_USER')
                        }
                        onView={() => ViewRma(option)}
                        onUploadPod={() => handelPodUpload(option)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rmaList.content?.length === 0 && (
            <div className={styles.emptyState}>No RMA requests found</div>
          )}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={rmaList.totalPages}
          onPageChange={gotToPage}
          variant="styled"
          styles={styles}
        />
      </div>

      <RmaPod_Upload
        visible={podUploadVisiable}
        setVisible={setPodUploadVisiabel}
        rma={podRmaDetails}
        existingPod={existingPod}
        setExistingPod={setExistingPod}
      />
    </div>
  )
}

export default RMA_Status
