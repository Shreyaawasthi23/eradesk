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
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { addNotes } from '@/api/incident_api'
import { getUserDetails } from '@/lib/auth'
import moment from 'moment'

const Incident_Notes = ({ visible, setVisible, incident, oldNotes, ...props }) => {
  const router = useRouter()
  const details = getUserDetails()

  const formatDate = (date) => {
    return moment(date).format('DD/MM/YYYY')
  }

  const formatTime = (date) => {
    return moment(date).format('hh:mm A')
  }

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      note: '',
      userId: details?.id,
      incidentId: incident.id,
    },
    validationSchema: Yup.object({
      note: Yup.string()
        .min(5, 'Must be 5 characters')
        .max(600, 'Must be 600 characters or less')
        .required('Required'),
      userId: Yup.string().required('Required'),
      incidentId: Yup.string().required('Required'),
    }),
    onSubmit: (values, { resetForm }) => {
      addNotes(values, resetForm, router, setVisible)
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
          <CModalTitle>Add Note #{incident.incidentId}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm onSubmit={formik.handleSubmit} className="row g-3">
            <CCol md={12}>
              <CFormTextarea
                type="text"
                label="Note"
                name="note"
                value={formik.values.note}
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                feedbackInvalid={
                  formik.touched.note && formik.errors.note ? formik.errors.note : null
                }
                invalid={formik.touched.note && formik.errors.note ? true : false}
                valid={formik.touched.note && !formik.errors.note ? true : false}
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
                    <CTableHeaderCell scope="col">Note</CTableHeaderCell>
                    <CTableHeaderCell scope="col">User Email</CTableHeaderCell>
                    <CTableHeaderCell scope="col">Create Date</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {oldNotes?.map((option, index, array) => {
                    return (
                      <CTableRow key={option.id}>
                        <CTableHeaderCell scope="row">{index}</CTableHeaderCell>
                        <CTableDataCell>{option.note}</CTableDataCell>
                        <CTableDataCell>{option.userEmail}</CTableDataCell>
                        <CTableDataCell>
                          {formatDate(option.createDate)} at {formatTime(option.createDate)}
                        </CTableDataCell>
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

export default Incident_Notes
