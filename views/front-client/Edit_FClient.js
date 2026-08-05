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
import { editFrontClient } from '@/api/frontclient_api'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import * as Yup from 'yup'

const Edit_FClient = () => {
  const router = useRouter()
  const { id } = router.query
  //   console.log(id)
  const details = getUserDetails()
  const [clientDetails, setClientDeatils] = useState({})
  const [usernameMessage, setUserNameMessage] = useState('')
  const validateUserName = async (value) => {
    try {
      var myHeaders = new Headers()
      myHeaders.append('X-Tenant', '' + tenant + '')
      myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

      var requestOptions = {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      }

      const response = await fetch(
        apiUrl + '/auth/front-client/check-by-name?name=' + value,
        requestOptions,
      )
      if (response.status === 401) {
        router.push('/')
      }
      const data = await response.json()
      if (data.statusCode === 200) {
        return true
      } else {
        return false
      }
    } catch (error) {
      throw error
    }
  }
  const getFrontCLientDeatils = () => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    fetch(apiUrl + '/auth/front-client/get-details?id=' + id, requestOptions)
      .then((response) => (response.status === 401 ? router.push('/') : response.json()))
      .then((result) => {
        if (result !== null) {
          setClientDeatils(result)
        }
      })
      .catch((error) => console.log('error', error))
  }
  const handleNameChange = (e, formik) => {
    formik.setFieldValue('name', e.target.value) // Update the field value
    formik.setFieldTouched('name', false) // Mark the field as untouched
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    fetch(apiUrl + '/auth/front-client/check-by-name?name=' + e.target.value, requestOptions)
      .then((response) => (response.status === 401 ? router.push('/') : response.json()))
      .then((result) => {
        console.log(result)
        if (result.statusCode === 200) {
          setUserNameMessage(result.message)
        } else {
          setUserNameMessage(result.message)
        }
      })
      .catch((error) => console.log('error', error))
  }
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: clientDetails,
    initialValues: {
      name: clientDetails.name,
      contactName: clientDetails.contactName,
      contactNumber: clientDetails.contactNumber,
      contactEmail: clientDetails.contactEmail,
      gstNumber: clientDetails.gstNumber,
      panNumber: clientDetails.panNumber,
      address: clientDetails.address,
      pinCode: clientDetails.pinCode,
      city: clientDetails.city,
      state: clientDetails.state,
      country: clientDetails.country,
      userId: clientDetails.userId,
      status: clientDetails.status,
      remarks: '',
      id: id,
    },
    validationSchema: Yup.object({
      contactName: Yup.string().max(15, 'Must be 20 characters or less').required('Required'),
      contactNumber: Yup.string()
        .min(10, 'Must be 10 characters')
        .max(11, 'Must not be more than 11 characters')
        .required('Required')
        .matches(/^[0-9]+$/, 'Invalid input. Only numbers are allowed.'),
      contactEmail: Yup.string().email('Invalid email address').required('Required'),
      address: Yup.string().max(200, 'Cant be more than 200 characters'),
      poNumber: '',
      status: Yup.boolean()
        .oneOf([true, false], 'Invalid input. Please select a value.')
        .required('Status is required'),
      remarks: Yup.string()
        .min(10, 'Must be 10 characters')
        .max(25, 'Must not be more than 25 characters')
        .required('Required'),
    }),
    onSubmit: (values) => {
      editFrontClient(values, router)
    },
  })
  useEffect(() => {
    if (!id) return
    getFrontCLientDeatils()
    // console.log(details)
  }, [id])
  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Edit Front Client</strong>
          </CCardHeader>
          <CCardBody>
            <CForm onSubmit={formik.handleSubmit} className="row g-3">
              <CCol md={6}>
                <CFormInput
                  type="text"
                  label="Name"
                  value={formik.values.name}
                  name="name"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
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
                  name="contactName"
                  value={formik.values.contactName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
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
                  name="contactNumber"
                  value={formik.values.contactNumber}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  feedbackInvalid={
                    formik.touched.contactNumber && formik.errors.contactNumber
                      ? formik.errors.contactNumber
                      : null
                  }
                  invalid={
                    formik.touched.contactNumber && formik.errors.contactNumber ? true : false
                  }
                  valid={formik.touched.contactNumber && formik.errors.contactNumber ? false : true}
                />
              </CCol>

              <CCol md={6}>
                <CFormInput
                  type="email"
                  label="Contact Email"
                  name="contactEmail"
                  value={formik.values.contactEmail}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  feedbackInvalid={
                    formik.touched.contactEmail && formik.errors.contactEmail
                      ? formik.errors.contactEmail
                      : null
                  }
                  invalid={formik.touched.contactEmail && formik.errors.contactEmail ? true : false}
                  valid={formik.touched.contactEmail && formik.errors.contactEmail ? false : true}
                />
              </CCol>
              <CCol md={6}>
                <CFormInput
                  type="text"
                  label="GST Number"
                  name="gstNumber"
                  value={formik.values.gstNumber}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  feedbackInvalid={
                    formik.touched.gstNumber && formik.errors.gstNumber
                      ? formik.errors.gstNumber
                      : null
                  }
                  invalid={formik.touched.gstNumber && formik.errors.gstNumber ? true : false}
                  valid={formik.touched.gstNumber && formik.errors.gstNumber ? false : true}
                />
              </CCol>

              <CCol md={6}>
                <CFormInput
                  type="text"
                  label="PAN Number"
                  name="panNumber"
                  value={formik.values.panNumber}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  feedbackInvalid={
                    formik.touched.panNumber && formik.errors.panNumber
                      ? formik.errors.panNumber
                      : null
                  }
                  invalid={formik.touched.panNumber && formik.errors.panNumber ? true : false}
                  valid={formik.touched.panNumber && formik.errors.panNumber ? false : true}
                />
              </CCol>

              <CCol md={6}>
                <CFormInput
                  type="text"
                  label="Address"
                  name="address"
                  value={formik.values.address}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  feedbackInvalid={
                    formik.touched.address && formik.errors.address ? formik.errors.address : null
                  }
                  invalid={formik.touched.address && formik.errors.address ? true : false}
                  valid={formik.touched.address && formik.errors.address ? false : true}
                />
              </CCol>

              <CCol md={6}>
                <CFormSelect
                  aria-label="Front Client Country Dropdown"
                  options={['Select', { label: 'India', value: 'India' }]}
                  label="Country"
                  value={formik.values.country}
                  name="country"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  feedbackInvalid={
                    formik.touched.country && formik.errors.country ? formik.errors.country : null
                  }
                  invalid={formik.touched.country && formik.errors.country ? true : false}
                  valid={formik.touched.country && formik.errors.country ? false : true}
                />
              </CCol>

              <CCol md={4}>
                <CFormInput
                  type="text"
                  label="Pincode"
                  name="pinCode"
                  value={formik.values.pinCode}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  feedbackInvalid={
                    formik.touched.pinCode && formik.errors.pinCode ? formik.errors.pinCode : null
                  }
                  invalid={formik.touched.pinCode && formik.errors.pinCode ? true : false}
                  valid={formik.touched.pinCode && formik.errors.pinCode ? false : true}
                />
              </CCol>

              <CCol md={4}>
                <CFormInput
                  type="text"
                  label="City"
                  name="city"
                  value={formik.values.city}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  feedbackInvalid={
                    formik.touched.city && formik.errors.city ? formik.errors.city : null
                  }
                  invalid={formik.touched.city && formik.errors.city ? true : false}
                  valid={formik.touched.city && formik.errors.city ? false : true}
                />
              </CCol>

              <CCol md={4}>
                <CFormInput
                  type="text"
                  label="State"
                  name="state"
                  value={formik.values.state}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  feedbackInvalid={
                    formik.touched.state && formik.errors.state ? formik.errors.state : null
                  }
                  invalid={formik.touched.state && formik.errors.state ? true : false}
                  valid={formik.touched.state && formik.errors.state ? false : true}
                />
              </CCol>

              <CCol md={6}>
                <CFormSelect
                  aria-label="Front Client Status Dropdown"
                  options={[
                    'Select',
                    { label: 'Active', value: 'true' },
                    { label: 'Deactive', value: 'false' },
                  ]}
                  label="Status"
                  value={formik.values.status}
                  name="status"
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
                  name="remarks"
                  value={formik.values.remarks}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
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
  )
}

export default Edit_FClient
