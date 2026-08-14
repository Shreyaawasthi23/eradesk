/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable react/prop-types */
import {
  CButton,
  CCol,
  CForm,
  CFormInput,
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
import { AddAssetReplacement } from '@/api/assets_api'
import * as Yup from 'yup'

const Add_Replacement = ({ visible, setVisible, asset, assetList, ...props }) => {
  const router = useRouter()

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      id: asset.id,
      replacementSerial: '',
    },
    validationSchema: Yup.object({
      replacementSerial: Yup.string().min(5, 'Must be 5 characters').required('Required'),
      id: Yup.string().required('Required'),
    }),
    onSubmit: (values, { resetForm }) => {
      AddAssetReplacement(values, setVisible, router, assetList)
      //   addNotes(values, resetForm, router, setVisible)
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
          <CModalTitle>Add Replacement #{asset.assetId}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm onSubmit={formik.handleSubmit} className="row g-3">
            <CCol md={6}>
              <CFormInput
                type="text"
                label="Serial"
                value={asset.serialNumber}
                name="serialNumber"
                disabled
              />
            </CCol>
            <CCol md={6}>
              <CFormInput
                type="text"
                label="Replacement Serial"
                name="replacementSerial"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                feedbackInvalid={
                  formik.touched.replacementSerial && formik.errors.replacementSerial
                    ? formik.errors.replacementSerial
                    : null
                }
                invalid={
                  formik.touched.replacementSerial && formik.errors.replacementSerial ? true : false
                }
                valid={
                  formik.touched.replacementSerial && !formik.errors.replacementSerial
                    ? true
                    : false
                }
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

export default Add_Replacement
