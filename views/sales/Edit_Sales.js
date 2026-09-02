import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CRow,
} from '@coreui/react'
import { useFormik } from 'formik'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import * as Yup from 'yup'
import { EditSalesParticipant } from '@/api/user_api'

const Edit_Sales = () => {
  const router = useRouter()
  const { id } = router.query
  const details = getUserDetails()

  const [salesDetails, setSaleDetails] = useState({})

  const getSalesDetails = async () => {
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
        apiUrl + '/auth/core/sales-team/get-details?id=' + id,
        requestOptions,
      )
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setSaleDetails(data)
        }
      }
    } catch (error) {
      console.log('error', error)
    }
  }

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: salesDetails.name,
      email: salesDetails.email,
      number: salesDetails.number,
      userId: details?.id,
      id: id,
    },
    validationSchema: Yup.object({
      name: Yup.string().required('Required'),
      userId: Yup.string().required('Required'),
      number: Yup.string()
        .min(10, 'Must be 10 characters')
        .max(11, 'Must not be more than 11 characters')
        .required('Required')
        .matches(/^[0-9]+$/, 'Invalid input. Only numbers are allowed.'),
      email: Yup.string().email('Invalid email address').required('Required'),
    }),
    onSubmit: (values) => {
      EditSalesParticipant(values, router)
    },
  })
  useEffect(() => {
    if (!id) return
    getSalesDetails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Add Sales Participent</strong>
            </CCardHeader>
            <CCardBody>
              <CForm onSubmit={formik.handleSubmit} className="row g-3">
                <CCol md={6}>
                  <CFormInput
                    type="text"
                    label="Name"
                    name="name"
                    value={formik.values.name}
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
                    label="Email"
                    name="email"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    feedbackInvalid={
                      formik.touched.email && formik.errors.email ? formik.errors.email : null
                    }
                    invalid={formik.touched.email && formik.errors.email ? true : false}
                    valid={formik.touched.email && formik.errors.email ? false : true}
                  />
                </CCol>
                <CCol md={6}>
                  <CFormInput
                    type="text"
                    label="Contact Number"
                    name="number"
                    value={formik.values.number}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    feedbackInvalid={
                      formik.touched.number && formik.errors.number ? formik.errors.number : null
                    }
                    invalid={formik.touched.number && formik.errors.number ? true : false}
                    valid={formik.touched.number && formik.errors.number ? false : true}
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

export default Edit_Sales
