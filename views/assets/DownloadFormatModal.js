import React, { useEffect, useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import * as XLSX from 'xlsx'
import { useRouter } from 'next/router'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import CappedSelect from '@/components/ui/CappedSelect'

import styles from './assets.module.scss'

const DownloadFormatModal = ({ onClose }) => {
  const details = getUserDetails()
  const router = useRouter()
  const [endClientList, setEndClientList] = useState([])
  const [poList, setPoList] = useState([])

  const getAllEndClients = () => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    fetch(apiUrl + '/auth/end-client/get-all', requestOptions)
      .then((response) => (response.status === 401 ? router.push('/') : response.json()))
      .then((result) => {
        if (result !== null) {
          setEndClientList(result)
        }
      })
      .catch((error) => console.log('error', error))
  }

  const getPOByEndClient = async (value) => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    try {
      const response = await fetch(
        apiUrl + '/auth/purchase/by-end-client?endClientId=' + value,
        requestOptions,
      )
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setPoList(data)
        }
      }
    } catch (error) {
      // ignore
    }
  }

  const handelEndClientSelect = (e, formik) => {
    formik.setFieldValue('endClientId', e.target.value)
    formik.setFieldValue('purchaseOrderNumber', '')
    formik.setFieldValue('frontClientId', '')
    getPOByEndClient(e.target.value)
  }

  const findByPo = (purchaseOrderNumber) =>
    poList?.find((item) => item.purchaseOrderNumber === purchaseOrderNumber)

  const handelPoSelection = (e, formik) => {
    const po = findByPo(e.target.value)
    formik.setFieldValue('frontClientId', po?.frontClientId)
    formik.setFieldValue('purchaseOrderNumber', e.target.value)
  }

  const handleDownload = (values) => {
    const data = [
      [
        'FrontClientId',
        'EndClientId',
        'PONumber',
        'StartDate',
        'EndDate',
        'SLA',
        'AssetType',
        'Make',
        'Model',
        'SerialNo',
        'PinCode',
        'City',
        'State',
        'Address',
      ],
      [values.frontClientId, values.endClientId, values.purchaseOrderNumber],
    ]

    const worksheet = XLSX.utils.sheet_add_aoa({}, data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })

    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'Assets-' + values.purchaseOrderNumber + '.xlsx')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    onClose()
  }

  const formik = useFormik({
    initialValues: {
      purchaseOrderNumber: '',
      endClientId: '',
      frontClientId: '',
    },
    validationSchema: Yup.object({
      purchaseOrderNumber: Yup.string().required('Required'),
      endClientId: Yup.string().required('Required'),
      frontClientId: Yup.string().required('Required'),
    }),
    onSubmit: (values) => {
      handleDownload(values)
    },
  })

  useEffect(() => {
    getAllEndClients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Download Assets Upload Template</h2>
          <button type="button" className={styles.modalClose} onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={formik.handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>End Client</label>
                <CappedSelect
                  name="endClientId"
                  value={formik.values.endClientId}
                  onChange={(e) => handelEndClientSelect(e, formik)}
                  onBlur={formik.handleBlur}
                  options={endClientList?.map((element) => ({
                    value: element.id,
                    label: element.name,
                  }))}
                />
                {formik.touched.endClientId && formik.errors.endClientId && (
                  <span className={styles.formFeedbackInvalid}>{formik.errors.endClientId}</span>
                )}
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>PO Number</label>
                <CappedSelect
                  name="purchaseOrderNumber"
                  value={formik.values.purchaseOrderNumber}
                  onChange={(e) => handelPoSelection(e, formik)}
                  onBlur={formik.handleBlur}
                  options={poList?.map((element) => ({
                    value: element.purchaseOrderNumber,
                    label: element.purchaseOrderNumber,
                  }))}
                />
                {formik.touched.purchaseOrderNumber && formik.errors.purchaseOrderNumber && (
                  <span className={styles.formFeedbackInvalid}>
                    {formik.errors.purchaseOrderNumber}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn}>
              Download
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DownloadFormatModal
