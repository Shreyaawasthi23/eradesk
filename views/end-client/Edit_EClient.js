import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormSelect,
  CRow,
} from '@coreui/react'
import { useFormik } from 'formik'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { editEndClient } from '@/apiClients/endclient_api'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import * as Yup from 'yup'

const Edit_EClient = () => {
  const router = useRouter()
  const { id } = router.query
  const details = getUserDetails()
  const [frontClientList, setFrontClientList] = useState([])
  const [endClientDetails, setEndClientDetails] = useState({})
  const getCurrentDateInput = (value) => {
    const dateObj = new Date(value)

    // get the month in this format of 04, the same for months
    const month = ('0' + (dateObj.getMonth() + 1)).slice(-2)
    const day = ('0' + dateObj.getDate()).slice(-2)
    const year = dateObj.getFullYear()

    const shortDate = `${year}-${month}-${day}`

    return shortDate
  }

  const getFrontCLients = () => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    fetch(apiUrl + '/auth/core/front-client/get-all-list', requestOptions)
      .then((response) => (response.status === 401 ? router.push('/') : response.json()))
      .then((result) => {
        if (result !== null) {
          setFrontClientList(result)
        }
      })
      .catch((error) => console.log('error', error))
  }
  const getEndClientDeatils = () => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    fetch(apiUrl + '/auth/core/end-client/details?id=' + id, requestOptions)
      .then((response) => (response.status === 401 ? router.push('/') : response.json()))
      .then((result) => {
        if (result !== null) {
          // console.log(result)
          setEndClientDetails(result)
        }
      })
      .catch((error) => console.log('error', error))
  }
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: endClientDetails,
    initialValues: {
      name: endClientDetails.name,
      contactName: endClientDetails.contactName,
      contactNumber: endClientDetails.contactNumber,
      contactEmail: endClientDetails.contactEmail,
      frontClientId: endClientDetails.frontClientId,
      userId: details?.id,
      status: endClientDetails.status,
      remarks: '',
      id: id,
    },
    validationSchema: Yup.object({
      frontClientId: Yup.string().required('Required'),
      name: Yup.string()
        .max(100, 'Must be 100 characters or less')
        .min(10, 'Must be 10 characters or more')
        .required('Required'),
      contactName: Yup.string()
        .max(100, 'Must be 100 characters or less')
        .min(10, 'Must be 10 characters or more')
        .required(),
      contactNumber: Yup.string()
        .min(10, 'Must be 10 characters')
        .max(11, 'Must not be more than 11 characters')
        .required('Required')
        .matches(/^[0-9]+$/, 'Invalid input. Only numbers are allowed.'),
      contactEmail: Yup.string().email('Invalid email address').required('Required'),
      status: Yup.boolean()
        .oneOf([true, false], 'Invalid input. Please select a value.')
        .required('Status is required'),
    }),
    onSubmit: (values) => {
      editEndClient(values, router)
    },
  })
  useEffect(() => {
    if (!id) return
    getFrontCLients()
    getEndClientDeatils()
  }, [id])
  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Create End Client</strong>
            </CCardHeader>
            <CCardBody>
              <CForm onSubmit={formik.handleSubmit} className="row g-3">
                <CCol md={6}>
                  <CFormSelect
                    aria-label="select front-client"
                    label="Front Client"
                    name="frontClientId"
                    value={formik.values.frontClientId}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    feedbackInvalid={
                      formik.touched.frontClientId && formik.errors.frontClientId
                        ? formik.errors.frontClientId
                        : null
                    }
                    invalid={
                      formik.touched.frontClientId && formik.errors.frontClientId ? true : false
                    }
                    valid={
                      formik.touched.frontClientId && formik.errors.frontClientId ? false : true
                    }
                  >
                    <option>Select</option>
                    {frontClientList?.map((element, index) => (
                      <option key={element.id} value={element.id}>
                        {element.name}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={6}>
                  <CFormInput
                    type="text"
                    label="Name"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    name="name"
                    value={formik.values.name}
                    feedbackInvalid={
                      formik.touched.name && formik.errors.name ? formik.errors.name : null
                    }
                    invalid={formik.touched.name && formik.errors.name ? true : false}
                    valid={formik.touched.name && formik.errors.name ? false : true}
                  />
                </CCol>
                <CCol md={6}>
                  <CFormInput
                    type="text"
                    label="Contact Name"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    name="contactName"
                    value={formik.values.contactName}
                    feedbackInvalid={
                      formik.touched.contactName && formik.errors.contactName
                        ? formik.errors.contactName
                        : null
                    }
                    invalid={formik.touched.contactName && formik.errors.contactName ? true : false}
                    valid={formik.touched.contactName && formik.errors.contactName ? false : true}
                  />
                </CCol>
                <CCol md={6}>
                  <CFormInput
                    type="text"
                    label="Contact Number"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    name="contactNumber"
                    value={formik.values.contactNumber}
                    feedbackInvalid={
                      formik.touched.contactNumber && formik.errors.contactNumber
                        ? formik.errors.contactNumber
                        : null
                    }
                    invalid={
                      formik.touched.contactNumber && formik.errors.contactNumber ? true : false
                    }
                    valid={
                      formik.touched.contactNumber && formik.errors.contactNumber ? false : true
                    }
                  />
                </CCol>
                <CCol md={6}>
                  <CFormInput
                    type="email"
                    label="Contact Email"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    name="contactEmail"
                    value={formik.values.contactEmail}
                    feedbackInvalid={
                      formik.touched.contactEmail && formik.errors.contactEmail
                        ? formik.errors.contactEmail
                        : null
                    }
                    invalid={
                      formik.touched.contactEmail && formik.errors.contactEmail ? true : false
                    }
                    valid={formik.touched.contactEmail && formik.errors.contactEmail ? false : true}
                  />
                </CCol>
                <CCol md={6}>
                  <CFormSelect
                    aria-label="End Client Status Dropdown"
                    options={[
                      'Select',
                      { label: 'Active', value: 'true' },
                      { label: 'Deactive', value: 'false' },
                    ]}
                    name="status"
                    value={formik.values.status}
                    label="Status"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    feedbackInvalid={
                      formik.touched.status && formik.errors.status ? formik.errors.status : null
                    }
                    invalid={formik.touched.status && formik.errors.status ? true : false}
                    valid={formik.touched.status && formik.errors.status ? false : true}
                  />
                </CCol>
                <CCol md={6}>
                  <CFormInput
                    type="text"
                    label="Remarks"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.remarks}
                    name="remarks"
                    feedbackInvalid={
                      formik.touched.remarks && formik.errors.remarks ? formik.errors.remarks : null
                    }
                    invalid={formik.touched.remarks && formik.errors.remarks ? true : false}
                    valid={formik.touched.remarks && formik.errors.remarks ? false : true}
                  />
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

export default Edit_EClient
