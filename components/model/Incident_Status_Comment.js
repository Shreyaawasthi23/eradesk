/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable react/prop-types */
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
} from '@coreui/react'
import { useFormik } from 'formik'
import React from 'react'
import { useRouter } from 'next/router'
import { updateIncidentStatus } from '@/apiClients/incident_api'
import { getUserDetails } from '@/lib/auth'
import * as Yup from 'yup'

const Incident_Status_Comment = ({
  statusValue,
  Incident,
  getIncidentPage,
  currentPage,
  visible,
  setVisible,
  ...props
}) => {
  const router = useRouter()
  const details = getUserDetails()

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      note: '',
      status: statusValue,
      incidentId: Incident.id,
    },
    validationSchema: Yup.object({
      note: Yup.string()
        .min(20, 'Must be 20 characters')
        .max(600, 'Must be 600 characters or less')
        .required('Required'),
      status: Yup.string().required('Required'),
      incidentId: Yup.string().required('Required'),
    }),
    onSubmit: (values, { resetForm }) => {
      updateIncidentStatus(values, router, getIncidentPage, currentPage, resetForm, setVisible)
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
          <CModalTitle>
            Add Comment againts the status {statusValue} of #{Incident.incidentId}
          </CModalTitle>
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

export default Incident_Status_Comment
