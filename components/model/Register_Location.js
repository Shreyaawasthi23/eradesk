/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable react/prop-types */
import React, { useState } from 'react'
import {
  CButton,
  CCol,
  CForm,
  CFormSelect,
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
import { useEffect } from 'react'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import moment from 'moment'

const Register_Location = ({ visible, setVisible, location, ...props }) => {
  console.log(location)
  const router = useRouter()
  const details = getUserDetails()
  // const [location, setLocation] = useState({
  //   location1: null,
  //   location2: null,
  // })

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
      incidentId: '',
      location: location,
    },
    validationSchema: Yup.object({
      // note: Yup.string()
      //   .min(5, 'Must be 5 characters')
      //   .max(70, 'Must be 70 characters or less')
      //   .required('Required'),
      userId: Yup.string().required('Required'),
      action: Yup.string().required('Required'),
    }),
    onSubmit: (values, { resetForm }) => {
      console.log(formik.values.location)
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
          <CModalTitle>Register Location</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm onSubmit={formik.handleSubmit} className="row g-3">
            <CCol md={6}>
              <CFormSelect
                aria-label="Action"
                label="Action"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.action}
                name="action"
                feedbackInvalid={
                  formik.touched.action && formik.errors.action ? formik.errors.action : null
                }
                invalid={formik.touched.action && formik.errors.action ? true : false}
                valid={formik.touched.action && !formik.errors.action ? true : false}
              >
                <option>Select</option>
                <option value={'Start'}>Start</option>
                <option value={'End'}>End</option>
              </CFormSelect>
            </CCol>
            <CFormTextarea name="location" value={formik.values.location}></CFormTextarea>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setVisible(false)}>
            Close
          </CButton>
          {/* <CButton color="primary" type="submit" onClick={formik.handleSubmit}>
            Submit
          </CButton> */}
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default Register_Location
