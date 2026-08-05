/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable react/prop-types */
import React, { useState } from 'react'
import {
  CButton,
  CCol,
  CForm,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { useRouter } from 'next/router'
import { getUserDetails } from '@/lib/auth'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { addChallanTracking } from '@/api/challan_api'

const Delivery_Status = ({ visible, setVisible, challan, tracking, ...props }) => {
  const router = useRouter()
  const details = getUserDetails()

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      status: '',
      userId: details?.id,
      challanId: challan.id,
    },
    validationSchema: Yup.object({
      status: Yup.string()
        .min(5, 'Must be 5 characters')
        .max(100, 'Must be 100 characters or less')
        .required('Required'),
      userId: Yup.string().required('Required'),
      challanId: Yup.string().required('Required'),
    }),
    onSubmit: (values, { resetForm }) => {
      addChallanTracking(values, resetForm, router, setVisible)
    },
  })
  return (
    <div>
      <CModal
        size="lg"
        alignment="center"
        visible={visible}
        onClose={() => setVisible(false)}
        backdrop="static"
        scrollable
      >
        <CModalHeader>
          <CModalTitle>Delivery Tracking #{challan.challanNo}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm onSubmit={formik.handleSubmit} className="row g-3">
            <CCol md={12}>
              <CFormTextarea
                type="text"
                label="Docket Details"
                name="status"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                feedbackInvalid={
                  formik.touched.status && formik.errors.status ? formik.errors.status : null
                }
                invalid={formik.touched.status && formik.errors.status ? true : false}
                valid={formik.touched.status && !formik.errors.status ? true : false}
              />
            </CCol>
          </CForm>
          <hr></hr>
          <CRow>
            <CCol xs={12}>
              <CTable bordered hover>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell scope="col">#</CTableHeaderCell>
                    <CTableHeaderCell scope="col">Status</CTableHeaderCell>
                    <CTableHeaderCell scope="col">User Email</CTableHeaderCell>
                    <CTableHeaderCell scope="col">Create Date</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {tracking?.map((option, index, array) => {
                    return (
                      <CTableRow key={option.id}>
                        <CTableHeaderCell scope="row">{index}</CTableHeaderCell>
                        <CTableDataCell>{option.status}</CTableDataCell>
                        <CTableDataCell>{option.email}</CTableDataCell>
                        <CTableDataCell>{option.createDate}</CTableDataCell>
                      </CTableRow>
                    )
                  })}
                </CTableBody>
              </CTable>
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setVisible(false)}>
            Close
          </CButton>
          <CButton color="primary" type="submit" onClick={formik.handleSubmit}>
            Submit
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default Delivery_Status
