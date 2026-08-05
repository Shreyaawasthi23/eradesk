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
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import * as Yup from 'yup'
import { useFormik } from 'formik'
import { useRouter } from 'next/router'
import { getUserDetails } from '@/lib/auth'
import { raiseRma } from '@/api/rma_api'

const New_Rma = ({ visible, setVisible, incident, ...props }) => {
  const router = useRouter()
  const details = getUserDetails()
  const [submitState, setSubmitState] = useState(false)
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      incidentRefId: incident.id,
      endClientRefId: incident.endClientId,
      incidentId: incident.incidentId,
      make: incident.make,
      model: incident.model,
      serialNo: incident.serialNumber,
      endClientName: incident.endClientName,
      contactName: incident.contactName,
      contactNumber: incident.contactNumber,
      contactEmail: incident.contactEmail,
      fullAddress: incident.fullAddress,
      city: incident.city,
      state: incident.state,
      pinCode: incident.pinCode,
      purchaseOrderNumber: incident.purchaseOrderNumber,
      partNumber: '',
      description: '',
      quantity: '',
      userId: details?.id,
      userEmail: details?.email,
    },
    validationSchema: Yup.object({
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
      quantity: Yup.number().required().min(1, 'Atleast 1 quantity is required'),
      description: Yup.string()
        .required()
        .min(5, 'Must be 5 characters')
        .max(50, 'Must be 50 characters or less'),
      partNumber: Yup.string()
        .required()
        .min(5, 'Must be 5 characters')
        .max(50, 'Must be 50 characters or less'),
    }),
    onSubmit: (values, { resetForm }) => {
      setSubmitState(true)
      raiseRma(values, router, setVisible, resetForm, setSubmitState)
    },
  })
  return (
    <div>
      <CModal
        size="xl"
        alignment="center"
        visible={visible}
        onClose={() => setVisible(false)}
        backdrop="static"
        scrollable
      >
        <CModalHeader>
          <CModalTitle>New RMA Request</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm onSubmit={formik.handleSubmit} className="row g-3">
            <CCardGroup>
              <CCard>
                <CCardBody>
                  <CCardTitle>Asset Details</CCardTitle>
                  <CCol md={12}>
                    <CFormInput
                      type="text"
                      label="Incident #"
                      name="incidentId"
                      value={formik.values.incidentId}
                      disabled
                    />
                  </CCol>
                  <CCol md={12}>
                    <CFormInput
                      type="text"
                      label="Make"
                      name="make"
                      value={formik.values.make}
                      disabled
                    />
                  </CCol>
                  <CCol md={12}>
                    <CFormInput
                      type="text"
                      label="Model"
                      name="model"
                      value={formik.values.model}
                      disabled
                    />
                  </CCol>
                  <CCol md={12}>
                    <CFormInput
                      type="text"
                      label="Serial #"
                      name="serial"
                      value={formik.values.serialNo}
                      disabled
                    />
                  </CCol>
                </CCardBody>
                <CCardFooter>
                  <small className="text-medium-emphasis"></small>
                </CCardFooter>
              </CCard>
              <CCard>
                <CCardBody>
                  <CCardTitle>End Client Details</CCardTitle>
                  <CCol md={12}>
                    <CFormInput
                      type="text"
                      label="Client Name"
                      name="endClientName"
                      value={formik.values.endClientName}
                      disabled
                    />
                  </CCol>
                  <CCol md={12}>
                    <CFormInput
                      type="text"
                      label="Contact Person"
                      name="contactName"
                      value={formik.values.contactName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      feedbackInvalid={
                        formik.touched.contactName && formik.errors.contactName
                          ? formik.errors.contactName
                          : null
                      }
                      invalid={
                        formik.touched.contactName && formik.errors.contactName ? true : false
                      }
                      valid={formik.touched.contactName && !formik.errors.contactName ? true : false}
                    />
                  </CCol>
                  <CCol md={12}>
                    <CFormInput
                      type="text"
                      label="Contact No."
                      name="contactNumber"
                      value={formik.values.contactNumber}
                      onBlur={formik.handleBlur}
                      onChange={formik.handleChange}
                      feedbackInvalid={
                        formik.touched.contactNumber && formik.errors.contactNumber
                          ? formik.errors.contactNumber
                          : null
                      }
                      invalid={
                        formik.touched.contactNumber && formik.errors.contactNumber ? true : false
                      }
                      valid={
                        formik.touched.contactNumber && !formik.errors.contactNumber
                          ? true
                          : false
                      }
                    />
                  </CCol>
                  <CCol md={12}>
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
                      invalid={
                        formik.touched.contactEmail && formik.errors.contactEmail ? true : false
                      }
                      valid={
                        formik.touched.contactEmail && !formik.errors.contactEmail ? true : false
                      }
                    />
                  </CCol>
                </CCardBody>
                <CCardFooter>
                  <small className="text-medium-emphasis"></small>
                </CCardFooter>
              </CCard>
              <CCard>
                <CCardBody>
                  <CCardTitle>Location Details</CCardTitle>
                  <CCol md={12}>
                    <CFormInput
                      type="text"
                      label="Full Address"
                      name="fullAddress"
                      value={formik.values.fullAddress}
                      disabled
                    />
                  </CCol>
                  <CCol md={12}>
                    <CFormInput
                      type="text"
                      label="City"
                      name="city"
                      value={formik.values.city}
                      disabled
                    />
                  </CCol>
                  <CCol md={12}>
                    <CFormInput
                      type="text"
                      label="State"
                      name="state"
                      value={formik.values.state}
                      disabled
                    />
                  </CCol>
                  <CCol md={12}>
                    <CFormInput
                      type="text"
                      label="Pincode"
                      name="pincode"
                      value={formik.values.pinCode}
                      disabled
                    />
                  </CCol>
                </CCardBody>
                <CCardFooter>
                  <small className="text-medium-emphasis"></small>
                </CCardFooter>
              </CCard>
            </CCardGroup>
            <CCol md={4}>
              <CFormInput
                type="text"
                label="Part No. / Alternative Part No."
                name="partNumber"
                value={formik.values.partNumber}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
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
                  formik.touched.description && formik.errors.description
                    ? formik.errors.description
                    : null
                }
                invalid={formik.touched.description && formik.errors.description ? true : false}
                valid={formik.touched.description && !formik.errors.description ? true : false}
              />
            </CCol>
            <CCol md={4}>
              <CFormInput
                type="text"
                label="Quantity"
                name="quantity"
                value={formik.values.quantity}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                feedbackInvalid={
                  formik.touched.quantity && formik.errors.quantity ? formik.errors.quantity : null
                }
                invalid={formik.touched.quantity && formik.errors.quantity ? true : false}
                valid={formik.touched.quantity && !formik.errors.quantity ? true : false}
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

export default New_Rma
