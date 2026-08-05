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
import { EditRma, EditRmaPurchase } from '@/api/rma_api'

const Edit_Rma_Purchase = ({
  visible,
  setVisible,
  rmaPurchaseDetails,
  setRmaDetails,
  ...props
}) => {
  const router = useRouter()
  const details = getUserDetails()
  const [submitState, setSubmitState] = useState(false)

  const calculateTotal = (e) => {
    formik.setFieldValue('quantity', e.target.value)
    formik.setFieldValue('totalAmount', (formik.values.perUnitPrice * e.target.value).toFixed(2))
  }

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      quantity: rmaPurchaseDetails.quantity,
      userId: details?.id,
      perUnitPrice: rmaPurchaseDetails.perUnitPrice,
      totalAmount: rmaPurchaseDetails.totalAmount,
      rmaRefId: rmaPurchaseDetails.rmaRefId,
      id: rmaPurchaseDetails.id,
      description: rmaPurchaseDetails.description,
    },
    validationSchema: Yup.object({
      perUnitPrice: Yup.number()
        .required('This field is required')
        .min(1, 'Value must be greater than or equal to 1')
        .typeError('Invalid number'),
      totalAmount: Yup.number()
        .required('This field is required')
        .min(1, 'Value must be greater than or equal to 1')
        .typeError('Invalid number'),
      quantity: Yup.number()
        .required('This field is required')
        .min(1, 'Value must be greater than or equal to 1')
        .typeError('Invalid number'),
      userId: Yup.string().required('Required'),
      rmaRefId: Yup.string().required('Required'),
      description: Yup.string().required('Required'),
    }),
    onSubmit: (values, { resetForm }) => {
      EditRmaPurchase(values, resetForm, router, setVisible, setSubmitState)
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
          <CModalTitle>Edit RMA Purchase #{rmaPurchaseDetails.rmaId}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm onSubmit={formik.handleSubmit} className="row g-3">
            <CCol md={3}>
              <CFormInput
                type="text"
                label="Description"
                name="description"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.description}
                feedbackInvalid={
                  formik.touched.description && formik.errors.description
                    ? formik.errors.description
                    : null
                }
                invalid={formik.touched.description && formik.errors.description ? true : false}
                valid={formik.touched.description && !formik.errors.description ? true : false}
              />
            </CCol>
            <CCol md={3}>
              <CFormInput
                type="text"
                label="Per Unit Price"
                name="perUnitPrice"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.perUnitPrice}
                feedbackInvalid={
                  formik.touched.perUnitPrice && formik.errors.perUnitPrice
                    ? formik.errors.perUnitPrice
                    : null
                }
                invalid={formik.touched.perUnitPrice && formik.errors.perUnitPrice ? true : false}
                valid={formik.touched.perUnitPrice && !formik.errors.perUnitPrice ? true : false}
              />
            </CCol>
            <CCol md={3}>
              <CFormInput
                type="text"
                label="Quantity"
                name="quantity"
                onChange={(e) => calculateTotal(e)}
                onBlur={formik.handleBlur}
                value={formik.values.quantity}
                feedbackInvalid={
                  formik.touched.quantity && formik.errors.quantity ? formik.errors.quantity : null
                }
                invalid={formik.touched.quantity && formik.errors.quantity ? true : false}
                valid={formik.touched.quantity && !formik.errors.quantity ? true : false}
              />
            </CCol>
            <CCol md={3}>
              <CFormInput
                type="text"
                label="Total Amount"
                name="totalAmount"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.totalAmount}
                disabled={true}
                feedbackInvalid={
                  formik.touched.totalAmount && formik.errors.totalAmount
                    ? formik.errors.totalAmount
                    : null
                }
                invalid={formik.touched.totalAmount && formik.errors.totalAmount ? true : false}
                valid={formik.touched.totalAmount && !formik.errors.totalAmount ? true : false}
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

export default Edit_Rma_Purchase
