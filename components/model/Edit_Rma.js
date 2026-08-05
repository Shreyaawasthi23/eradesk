/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable react/prop-types */
import React, { useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CCardGroup,
  CCardText,
  CCardTitle,
  CCol,
  CForm,
  CFormInput,
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
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { useRouter } from 'next/router'
import { getUserDetails } from '@/lib/auth'
import { EditRma } from '@/api/rma_api'

const Edit_Rma = ({ visible, setVisible, rmaDetails, setRmaDetails, ...props }) => {
  const router = useRouter()
  const details = getUserDetails()
  const [submitState, setSubmitState] = useState(false)

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      partNumber: rmaDetails.partNumber,
      description: rmaDetails.description,
      quantity: rmaDetails.quantity,
      status: rmaDetails.status,
      contactName: rmaDetails.contactName,
      contactNumber: rmaDetails.contactNumber,
      contactEmail: rmaDetails.contactEmail,
      userId: details?.id,
      id: rmaDetails.id,
      remarks: '',
    },
    validationSchema: Yup.object({
      partNumber: Yup.string().required('Required'),
      description: Yup.string().required('Required'),
      quantity: Yup.string()
        .required('Required')
        .matches(/^[0-9]+$/, 'Invalid input. Only numbers are allowed.'),
      status: Yup.string().required('Required'),
      contactName: Yup.string()
        .min(5, 'Must be 5 characters')
        .max(30, 'Must be 30 characters or less')
        .required('Required'),
      contactNumber: Yup.string()
        .min(10, 'Must be 10 characters')
        .max(11, 'Must not be more than 11 characters')
        .required('Required')
        .matches(/^[0-9]+$/, 'Invalid input. Only numbers are allowed.'),
      contactEmail: Yup.string().email('Invalid email address').required('Required'),
      userId: Yup.string().required('Required'),
      remarks: Yup.string()
        .min(10, 'Must be 10 characters')
        .max(60, 'Must not be more than 60 characters')
        .required('Required'),
    }),
    onSubmit: (values, { resetForm }) => {
      EditRma(values, resetForm, router, setVisible, setSubmitState)
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
          <CModalTitle>Edit RMA #{rmaDetails.rmaId}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm onSubmit={formik.handleSubmit} className="row g-3">
            <CCol md={4}>
              <CFormInput
                type="text"
                label="Part Number"
                name="partNumber"
                value={formik.values.partNumber}
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                feedbackInvalid={
                  formik.touched.partNumber && formik.errors.partNumber
                    ? formik.errors.partNumber
                    : null
                }
                invalid={formik.touched.partNumber && formik.errors.partNumber ? true : false}
                valid={formik.touched.partNumber && !formik.errors.partNumber ? true : false}
              />
            </CCol>
            <CCol md={4}>
              <CFormInput
                type="text"
                label="Description"
                name="description"
                value={formik.values.description}
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                feedbackInvalid={
                  formik.touched.note && formik.errors.note ? formik.errors.note : null
                }
                invalid={formik.touched.note && formik.errors.note ? true : false}
                valid={formik.touched.note && !formik.errors.note ? true : false}
              />
            </CCol>
            <CCol md={4}>
              <CFormInput
                type="text"
                label="Quantity"
                name="quantity"
                value={formik.values.quantity}
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                feedbackInvalid={
                  formik.touched.quantity && formik.errors.quantity ? formik.errors.quantity : null
                }
                invalid={formik.touched.quantity && formik.errors.quantity ? true : false}
                valid={formik.touched.quantity && !formik.errors.quantity ? true : false}
              />
            </CCol>
            <CCol md={4}>
              <CFormSelect
                aria-label="Status"
                label="Status"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.status}
                name="status"
                feedbackInvalid={
                  formik.touched.status && formik.errors.status ? formik.errors.status : null
                }
                invalid={formik.touched.status && formik.errors.status ? true : false}
                valid={formik.touched.status && !formik.errors.status ? true : false}
              >
                <option>Select</option>
                <option value={'Pending'}>Pending</option>
                <option value={'WAITING FOR FAULTY RETURN'}>WAITING FOR FAULTY RETURN</option>
                <option value={'CLOSED'}>CLOSED</option>
              </CFormSelect>
            </CCol>
            <CCol md={4}>
              <CFormInput
                type="text"
                label="Contact Name"
                name="contactName"
                value={formik.values.contactName}
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                feedbackInvalid={
                  formik.touched.contactName && formik.errors.contactName
                    ? formik.errors.contactName
                    : null
                }
                invalid={formik.touched.contactName && formik.errors.contactName ? true : false}
                valid={formik.touched.contactName && !formik.errors.contactName ? true : false}
              />
            </CCol>
            <CCol md={4}>
              <CFormInput
                type="text"
                label="Contact Number"
                name="contactNumber"
                value={formik.values.contactNumber}
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                feedbackInvalid={
                  formik.touched.contactNumber && formik.errors.contactNumber
                    ? formik.errors.contactNumber
                    : null
                }
                invalid={formik.touched.contactNumber && formik.errors.contactNumber ? true : false}
                valid={formik.touched.contactNumber && !formik.errors.contactNumber ? true : false}
              />
            </CCol>
            <CCol md={4}>
              <CFormInput
                type="text"
                label="Contact Email"
                name="contactEmail"
                value={formik.values.contactEmail}
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                feedbackInvalid={
                  formik.touched.contactEmail && formik.errors.contactEmail
                    ? formik.errors.contactEmail
                    : null
                }
                invalid={formik.touched.contactEmail && formik.errors.contactEmail ? true : false}
                valid={formik.touched.contactEmail && !formik.errors.contactEmail ? true : false}
              />
            </CCol>
            <CCol md={8}>
              <CFormInput
                type="text"
                label="Remarks"
                name="remarks"
                value={formik.values.remarks}
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                feedbackInvalid={
                  formik.touched.remarks && formik.errors.remarks ? formik.errors.remarks : null
                }
                invalid={formik.touched.remarks && formik.errors.remarks ? true : false}
                valid={formik.touched.remarks && !formik.errors.remarks ? true : false}
              />
            </CCol>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setVisible(false)}>
            Close
          </CButton>
          {submitState ? (
            <button className="btn btn-primary" type="button" disabled>
              <span
                className="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              ></span>{' '}
              Loading...
            </button>
          ) : (
            <CButton color="primary" type="submit" onClick={formik.handleSubmit}>
              Submit
            </CButton>
          )}
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default Edit_Rma
