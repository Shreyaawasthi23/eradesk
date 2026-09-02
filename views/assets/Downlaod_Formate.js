import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormSelect,
  CRow,
} from '@coreui/react'
import { faUpload } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useFormik } from 'formik'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import * as XLSX from 'xlsx'
import * as Yup from 'yup'

const Downlaod_Formate = () => {
  const details = getUserDetails()
  const router = useRouter()
  const [endClientList, setEndClientList] = useState([])
  const [poList, setPoList] = useState([])
  const handelUpload = () => {
    router.push('/upload-assets')
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
      // AddAssets(values, router)
      handleDownload(values)
    },
  })
  const getAllEndClients = () => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    fetch(apiUrl + '/auth/core/end-client/get-all', requestOptions)
      .then((response) => (response.status === 401 ? router.push('/') : response.json()))
      .then((result) => {
        if (result !== null) {
          setEndClientList(result)
        }
      })
      .catch((error) => console.log('error', error))
  }
  const handelEndClientSelect = (e, formik) => {
    formik.setFieldValue('endClientId', e.target.value)
    getPOByEndClient(e.target.value, formik)
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
        apiUrl + '/auth/core/purchase/by-end-client?endClientId=' + value,
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
      // console.error('Error fetching data:', error)
      // Handle the error (e.g., show an error message, retry the request, etc.)
    }
  }
  const handelPoSelection = (e, formik) => {
    const po = findByPo(e.target.value)
    formik.setFieldValue('frontClientId', po?.frontClientId)
    formik.setFieldValue('purchaseOrderNumber', e.target.value)
  }
  const findByPo = (purchaseOrderNumber) => {
    return poList?.find((item) => item.purchaseOrderNumber === purchaseOrderNumber)
  }
  useEffect(() => {
    getAllEndClients()
  }, [])
  return (
    <>
      {/* <button onClick={handleDownload}>Download Excel Template</button> */}
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Download Assets Upload Excel</strong>
              <CButton
                className="pull-right"
                size="sm"
                color="danger"
                onClick={(e) => handelUpload()}
              >
                <FontAwesomeIcon icon={faUpload} style={{ color: '#ffffff' }} fade />
              </CButton>
            </CCardHeader>
            <CCardBody>
              <CForm onSubmit={formik.handleSubmit} className="row g-3">
                <CCol md={6}>
                  <CFormSelect
                    aria-label="End Clients"
                    label="End-Clients"
                    name="endClientId"
                    onChange={(e) => handelEndClientSelect(e, formik)}
                    onBlur={formik.handleBlur}
                    feedbackInvalid={
                      formik.touched.endClientId && formik.errors.endClientId
                        ? formik.endClientId
                        : null
                    }
                    invalid={formik.touched.endClientId && formik.errors.endClientId ? true : false}
                    valid={formik.touched.endClientId && formik.errors.endClientId ? false : true}
                  >
                    <option>Select</option>
                    {endClientList?.map((element, index) => (
                      <option key={element.id} value={element.id}>
                        {element.name}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>

                <CCol md={6}>
                  <CFormSelect
                    aria-label="PO Number"
                    label="PO Number"
                    name="purchaseOrderNumber"
                    onChange={(e) => handelPoSelection(e, formik)}
                    onBlur={formik.handleBlur}
                    feedbackInvalid={
                      formik.touched.purchaseOrderNumber && formik.errors.purchaseOrderNumber
                        ? formik.purchaseOrderNumber
                        : null
                    }
                    invalid={
                      formik.touched.purchaseOrderNumber && formik.errors.purchaseOrderNumber
                        ? true
                        : false
                    }
                    valid={
                      formik.touched.purchaseOrderNumber && formik.errors.purchaseOrderNumber
                        ? false
                        : true
                    }
                  >
                    <option>Select</option>
                    {poList?.map((element, index) => (
                      <option key={element.purchaseOrderNumber} value={element.purchaseOrderNumber}>
                        {element.purchaseOrderNumber}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>

                <CCol xs={6}>
                  <CButton type="submit">Submit</CButton>
                </CCol>
              </CForm>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default Downlaod_Formate
