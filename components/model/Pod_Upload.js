/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable react/prop-types */
import React, { useState } from 'react'
import {
  CButton,
  CCol,
  CForm,
  CFormInput,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import { useRouter } from 'next/router'
import { getUserDetails } from '@/lib/auth'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { apiUrl, tenant } from '@/lib/config'
import Swal from 'sweetalert2'

const Pod_Upload = ({ visible, setVisible, challan, existingPod, setExistingPod, ...props }) => {
  // Assuming you have the binary data in the format 'BinData(0, 'iVBORw0KGgoAAAANSUhEUgAAAfQAAAH0CAYAAADL1t+KAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAO3RFWHRDb21tZW50AHhyOmQ6...)'
  const binaryData = existingPod?.image?.data.data
  let imageUrl = 'No POD Exist!'

  if (typeof binaryData === 'string') {
    const base64Data = binaryData.replace(/BinData\(0, '([^']+)'\)/, '$1')
    imageUrl = `data:image/png;base64,${base64Data}`
  } else {
    imageUrl = 'No POD Exist!'
  }

  const router = useRouter()
  const details = getUserDetails()

  const validationSchema = Yup.object().shape({
    file: Yup.mixed().test('fileSize', 'File size should be less than 10MB', (value) =>
      value ? value.size <= 10 * 1024 * 1024 : true,
    ),
  })

  const handelUpload = async (values) => {
    try {
      const myHeaders = new Headers()
      myHeaders.append('X-Tenant', '' + tenant + '')
      myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

      const formdata = new FormData()
      formdata.append('podImage', values.file, values.file.name)

      const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: formdata,
        redirect: 'follow',
      }

      const response = await fetch(
        apiUrl + '/auth/challan/add-pod?id=' + challan.id + '&userId=' + details?.id + '',
        requestOptions,
      )

      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data.statusCode === 200) {
          Swal.fire({
            title: 'Success',
            text: data.message,
            icon: 'success',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes',
          }).then((result) => {
            if (result.isConfirmed) {
              router.push('/view-challans')
              setVisible(false)
            } else {
              setVisible(false)
            }
          })
        } else {
          Swal.fire('Oops!', `${data.message}`, 'warning')
        }
      }
    } catch (error) {
      console.log('error', error)
    }
  }

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: { file: null },
    validationSchema: validationSchema,
    onSubmit: handelUpload,
  })
  const handleSubmit = (event) => {
    event.preventDefault()
    formik.validateForm().then(() => {
      formik.handleSubmit()
    })
  }

  return (
    <div>
      <CModal
        size="lg"
        alignment="center"
        visible={visible}
        onClose={() => {
          setVisible(false)
          setExistingPod(null)
        }}
        backdrop="static"
        scrollable
      >
        <CModalHeader>
          <CModalTitle>Upload POD #{challan.challanNo}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm onSubmit={handleSubmit} className="row g-3">
            <CCol md={12}>
              <CFormInput
                type="file"
                label="POD File"
                name="file"
                onBlur={formik.handleBlur}
                onChange={(event) => {
                  formik.setFieldValue('file', event.target.files[0])
                }}
                feedbackInvalid={
                  formik.touched.file && formik.errors.file ? formik.errors.file : null
                }
                invalid={formik.touched.file && formik.errors.file ? true : false}
                valid={formik.touched.file && !formik.errors.file ? true : false}
              />
            </CCol>
            <CCol md={12} style={{ textAlign: 'center' }}>
              <img src={imageUrl} alt="Image" />
            </CCol>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => {
              setVisible(false)
              setExistingPod(null)
            }}
          >
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

export default Pod_Upload
