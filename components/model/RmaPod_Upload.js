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

function RmaPod_Upload({ visible, setVisible, rma, existingPod, setExistingPod, ...props }) {
  const binaryData = existingPod?.image?.data?.data
  const existingImageUrl =
    typeof binaryData === 'string' ? `data:image/png;base64,${binaryData}` : null

  const [previewUrl, setPreviewUrl] = useState(null)

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
        apiUrl + '/auth/rma/add-rma-pod?id=' + rma?.id + '&userId=' + details?.id + '',
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
            confirmButtonText: 'OK',
          }).then((result) => {
            if (result.isConfirmed) {
              router.push('/rma')
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
          setPreviewUrl(null)
        }}
        backdrop="static"
        scrollable
      >
        <CModalHeader>
          <CModalTitle>Upload POD #{rma?.rmaId}</CModalTitle>
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
                  const selectedFile = event.target.files[0]
                  if (existingPod !== null) {
                    Swal.fire({
                      title: 'Warning',
                      text: 'Are you sure you want to replace the existing POD ?',
                      icon: 'question',
                      showCancelButton: true,
                      confirmButtonColor: '#3085d6',
                      cancelButtonColor: '#d33',
                      confirmButtonText: 'OK',
                    }).then((result) => {
                      if (result.isConfirmed) {
                        formik.setFieldValue('file', selectedFile)
                        setPreviewUrl(selectedFile ? URL.createObjectURL(selectedFile) : null)
                      } else {
                        setVisible(false)
                      }
                    })
                  } else {
                    formik.setFieldValue('file', selectedFile)
                    setPreviewUrl(selectedFile ? URL.createObjectURL(selectedFile) : null)
                  }
                }}
                feedbackInvalid={
                  formik.touched.file && formik.errors.file ? formik.errors.file : null
                }
                invalid={formik.touched.file && formik.errors.file ? true : false}
                valid={formik.touched.file && !formik.errors.file ? true : false}
              />
            </CCol>
            <CCol md={12} style={{ textAlign: 'center' }}>
              {previewUrl ? (
                <>
                  <p style={{ marginBottom: 4, fontSize: 13, color: '#6b7280' }}>New file preview</p>
                  <img src={previewUrl} alt="Selected POD preview" style={{ maxWidth: '100%', maxHeight: 300 }} />
                </>
              ) : existingImageUrl ? (
                <>
                  <p style={{ marginBottom: 4, fontSize: 13, color: '#6b7280' }}>Current POD</p>
                  <img src={existingImageUrl} alt="Existing POD" style={{ maxWidth: '100%', maxHeight: 300 }} />
                </>
              ) : (
                <p style={{ color: '#6b7280' }}>No POD Exist!</p>
              )}
            </CCol>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => {
              setVisible(false)
              setExistingPod(null)
              setPreviewUrl(null)
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

export default RmaPod_Upload
