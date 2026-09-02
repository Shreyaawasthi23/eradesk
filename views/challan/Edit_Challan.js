import React, { useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CCardGroup,
  CCardHeader,
  CCardText,
  CCardTitle,
  CCol,
  CForm,
  CFormInput,
  CFormSelect,
  CRow,
} from '@coreui/react'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { useRouter } from 'next/router'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { useEffect } from 'react'
import { updateChallan } from '@/api/challan_api'

const Edit_Challan = () => {
  const router = useRouter()
  const { id } = router.query
  const details = getUserDetails()
  const [challan, setChallan] = useState({})

  const getChallanDetails = async () => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    try {
      const response = await fetch(apiUrl + '/auth/core/challan/details?id=' + id, requestOptions)
      const result = await response.json()
      if (result) {
        setChallan(result)
      }
    } catch (error) {
      console.log('error', error)
    }
  }
  const handleDateChange = (e, formik) => {
    const inputValue = e.target.value
    const selectedDate = inputValue ? new Date(inputValue) : new Date() // Use selected date or current date
    const javaUtilDate = new Date(selectedDate.getTime())
    formik.setFieldValue('date', javaUtilDate)
  }
  const handelFromCompany = (e, formik) => {
    if (e.target.value == 1) {
      formik.setFieldValue('fromName', 'LRS Services Private Limited')
      formik.setFieldValue('fromAddressLane', 'First Floor, C-4/39, Lane No-3, Sadatpur Extn')
      formik.setFieldValue('fromAddressLaneExt', 'Karawal Nagar, Delhi-110094')
      formik.setFieldValue('fromGst', '07AACCL6399N1ZQ')
      formik.setFieldValue('fromContact', '9899448062, 9821042253')
    } else if (e.target.value == 2) {
      formik.setFieldValue('fromName', 'LRS Services Private Limited')
      formik.setFieldValue('fromAddressLane', 'Block- C, C-52, First floor, Sector 62 NOIDA')
      formik.setFieldValue('fromAddressLaneExt', 'UP 201309')
      formik.setFieldValue('fromGst', '09AACCL6399N1ZM')
      formik.setFieldValue('fromContact', '8527870407, 8750404769')
    }
  }
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      fromName: challan.fromName,
      fromAddressLane: challan.fromAddressLane,
      fromAddressLaneExt: challan.fromAddressLaneExt,
      fromGst: challan.fromGst,
      fromContact: challan.fromContact,
      toName: challan.toName,
      toAddressLane: challan.toAddressLane,
      toAddressLaneExt: challan.toAddressLaneExt,
      toContactName: challan.toContactName,
      toContact: challan.toContact,
      date: challan.date,
      poNumber: challan.poNumber,
      rmaId: challan.rmaId,
      rmaRefId: challan.rmaRefId,
      incidentId: challan.incidentId,
      incidentRefId: challan.incidentRefId,
      deliveredBy: challan.deliveredBy,
      itemDescription: challan.itemDescription,
      quantity: challan.quantity,
      remarks: challan.remarks,
      userId: details?.id,
      status: challan.status,
      editRemarks: '',
      id: id,
    },
    validationSchema: Yup.object({
      fromName: Yup.string().max(30, 'Must be 30 characters or less').required('Required'),
      fromAddressLane: Yup.string().max(100, 'Must be 100 characters or less').required('Required'),
      fromAddressLaneExt: Yup.string().max(30, 'Must be 30 characters or less'),
      fromGst: Yup.string()
        .required('Required')
        .matches(
          /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
          'Please enter a valid GST Number',
        ),
      fromContact: Yup.string().required('Required'),
      toName: Yup.string().max(300, 'Must be 300 characters or less').required('Required'),
      toAddressLane: Yup.string().max(300, 'Must be 300 characters or less').required('Required'),
      toAddressLaneExt: Yup.string().max(150, 'Must be 150 characters or less'),
      toContactName: Yup.string().max(30, 'Must be 30 characters or less').required('Required'),
      toContact: Yup.string()
        .min(10, 'Must be 10 characters')
        .max(25, 'Must not be more than 25 characters')
        .required('Required'),
      date: Yup.string().required('Required'),
      poNumber: Yup.string().max(30, 'Must be 30 characters or less').required('Required'),
      rmaId: Yup.string().max(30, 'Must be 30 characters or less').required('Required'),
      rmaRefId: Yup.string().required('Required'),
      incidentId: Yup.string().required('Required'),
      incidentRefId: Yup.string().required('Required'),
      deliveredBy: Yup.string().max(30, 'Must be 30 characters or less').required('Required'),
      itemDescription: Yup.string().max(150, 'Must be 150 characters or less').required('Required'),
      quantity: Yup.number().required('Required'),
      remarks: Yup.string().max(300, 'Must be 300 characters or less').required('Required'),
      userId: Yup.string().max(30, 'Must be 30 characters or less').required('Required'),
      editRemarks: Yup.string().max(30, 'Must be 30 characters or less').required('Required'),
    }),
    onSubmit: (values) => {
      //   console.log(values)
      updateChallan(values, router)
    },
  })
  //   console.log(formik.values)
  //   console.log(challan, 'challan')
  useEffect(() => {
    if (!id) return
    getChallanDetails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <b>Edit Challan #{challan.challanNo}</b>
          </CCardHeader>
          <CCardBody>
            <CForm onSubmit={formik.handleSubmit} className="row g-3">
              <CCardGroup>
                <CCard>
                  <CCardBody>
                    <CCardTitle>FROM</CCardTitle>
                    <CCol md={12}>
                      <CFormSelect
                        aria-label="From Company"
                        label="From Company"
                        name="fromName"
                        onChange={(e) => handelFromCompany(e, formik)}
                        onBlur={formik.handleBlur}
                        feedbackInvalid={
                          formik.touched.fromName && formik.errors.fromName ? formik.fromName : null
                        }
                        invalid={formik.touched.fromName && formik.errors.fromName ? true : false}
                        valid={formik.touched.fromName && formik.errors.fromName ? false : true}
                      >
                        <option>Select</option>
                        <option disabled>
                          <b>Delhi</b>
                        </option>
                        <option value={1}>LRS Services Private Limited</option>
                        <option disabled>
                          <b>UP</b>
                        </option>
                        <option value={2}>LRS Services Private Limited</option>
                      </CFormSelect>
                    </CCol>
                    <CCol md={12}>
                      <CFormInput
                        type="text"
                        label="Address Lane 1"
                        name="fromAddressLane"
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        value={formik.values.fromAddressLane}
                        feedbackInvalid={
                          formik.touched.fromAddressLane && formik.errors.fromAddressLane
                            ? formik.errors.fromAddressLane
                            : null
                        }
                        invalid={
                          formik.touched.fromAddressLane && formik.errors.fromAddressLane
                            ? true
                            : false
                        }
                        valid={
                          formik.touched.fromAddressLane && formik.errors.fromAddressLane
                            ? false
                            : true
                        }
                      />
                    </CCol>
                    <CCol md={12}>
                      <CFormInput
                        type="text"
                        label="Address Lane 2"
                        name="fromAddressLaneExt"
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        value={formik.values.fromAddressLaneExt}
                        feedbackInvalid={
                          formik.touched.fromAddressLaneExt && formik.errors.fromAddressLaneExt
                            ? formik.errors.fromAddressLaneExt
                            : null
                        }
                        invalid={
                          formik.touched.fromAddressLaneExt && formik.errors.fromAddressLaneExt
                            ? true
                            : false
                        }
                        valid={
                          formik.touched.fromAddressLaneExt && formik.errors.fromAddressLaneExt
                            ? false
                            : true
                        }
                      />
                    </CCol>
                    <CCol md={12}>
                      <CFormInput
                        type="text"
                        label="GSTTIN"
                        name="fromGst"
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        value={formik.values.fromGst}
                        feedbackInvalid={
                          formik.touched.fromGst && formik.errors.fromGst
                            ? formik.errors.fromGst
                            : null
                        }
                        invalid={formik.touched.fromGst && formik.errors.fromGst ? true : false}
                        valid={formik.touched.fromGst && formik.errors.fromGst ? false : true}
                      />
                    </CCol>
                    <CCol md={12}>
                      <CFormInput
                        type="text"
                        label="Contact Number"
                        name="fromContact"
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        value={formik.values.fromContact}
                        feedbackInvalid={
                          formik.touched.fromContact && formik.errors.fromContact
                            ? formik.errors.fromContact
                            : null
                        }
                        invalid={
                          formik.touched.fromContact && formik.errors.fromContact ? true : false
                        }
                        valid={
                          formik.touched.fromContact && formik.errors.fromContact ? false : true
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
                    <CCardTitle>TO</CCardTitle>
                    <CCol md={12}>
                      <CFormInput
                        type="text"
                        label="Compnay Name"
                        name="toName"
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        value={formik.values.toName}
                        feedbackInvalid={
                          formik.touched.toName && formik.errors.toName
                            ? formik.errors.toName
                            : null
                        }
                        invalid={formik.touched.toName && formik.errors.toName ? true : false}
                        valid={formik.touched.toName && formik.errors.toName ? false : true}
                      />
                    </CCol>
                    <CCol md={12}>
                      <CFormInput
                        type="text"
                        label="Address Lane 1"
                        name="toAddressLane"
                        value={formik.values.toAddressLane}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        feedbackInvalid={
                          formik.touched.toAddressLane && formik.errors.toAddressLane
                            ? formik.errors.toAddressLane
                            : null
                        }
                        invalid={
                          formik.touched.toAddressLane && formik.errors.toAddressLane ? true : false
                        }
                        valid={
                          formik.touched.toAddressLane && formik.errors.toAddressLane ? false : true
                        }
                      />
                    </CCol>
                    <CCol md={12}>
                      <CFormInput
                        type="text"
                        label="Address Lane 2"
                        name="toAddressLaneExt"
                        value={formik.values.toAddressLaneExt}
                        onBlur={formik.handleBlur}
                        onChange={formik.handleChange}
                        feedbackInvalid={
                          formik.touched.toAddressLaneExt && formik.errors.toAddressLaneExt
                            ? formik.errors.toAddressLaneExt
                            : null
                        }
                        invalid={
                          formik.touched.toAddressLaneExt && formik.errors.toAddressLaneExt
                            ? true
                            : false
                        }
                        valid={
                          formik.touched.toAddressLaneExt && formik.errors.toAddressLaneExt
                            ? false
                            : true
                        }
                      />
                    </CCol>
                    <CCol md={12}>
                      <CFormInput
                        type="text"
                        label="Contact Person"
                        name="toContactName"
                        value={formik.values.toContactName}
                        onBlur={formik.handleBlur}
                        onChange={formik.handleChange}
                        feedbackInvalid={
                          formik.touched.toContactName && formik.errors.toContactName
                            ? formik.errors.toContactName
                            : null
                        }
                        invalid={
                          formik.touched.toContactName && formik.errors.toContactName ? true : false
                        }
                        valid={
                          formik.touched.toContactName && formik.errors.toContactName ? false : true
                        }
                      />
                    </CCol>
                    <CCol md={12}>
                      <CFormInput
                        type="text"
                        label="Contact Number"
                        name="toContact"
                        value={formik.values.toContact}
                        onBlur={formik.handleBlur}
                        onChange={formik.handleChange}
                        feedbackInvalid={
                          formik.touched.toContact && formik.errors.toContact
                            ? formik.errors.toContact
                            : null
                        }
                        invalid={formik.touched.toContact && formik.errors.toContact ? true : false}
                        valid={formik.touched.toContact && formik.errors.toContact ? false : true}
                      />
                    </CCol>
                  </CCardBody>
                  <CCardFooter>
                    <small className="text-medium-emphasis"></small>
                  </CCardFooter>
                </CCard>
                <CCard>
                  <CCardBody>
                    <CCardTitle>OTHER INFO</CCardTitle>
                    <CCol md={12}>
                      <CFormInput
                        type="date"
                        label="Date"
                        onChange={(e) => handleDateChange(e, formik)}
                        name="date"
                        feedbackInvalid={
                          formik.touched.date && formik.errors.date ? formik.errors.date : null
                        }
                        invalid={formik.touched.date && formik.errors.date ? true : false}
                        valid={formik.touched.date && formik.errors.date ? false : true}
                      />
                    </CCol>
                    <CCol md={12}>
                      <CFormInput
                        type="text"
                        label="PO Number"
                        name="poNumber"
                        value={formik.values.poNumber}
                        onBlur={formik.handleBlur}
                        onChange={formik.handleChange}
                        feedbackInvalid={
                          formik.touched.poNumber && formik.errors.poNumber
                            ? formik.errors.poNumber
                            : null
                        }
                        invalid={formik.touched.poNumber && formik.errors.poNumber ? true : false}
                        valid={formik.touched.poNumber && formik.errors.poNumber ? false : true}
                        disabled
                      />
                    </CCol>
                    <CCol md={12}>
                      <CFormInput
                        type="text"
                        label="Incident"
                        name="incidentId"
                        value={formik.values.incidentId}
                        onBlur={formik.handleBlur}
                        onChange={formik.handleChange}
                        feedbackInvalid={
                          formik.touched.incidentId && formik.errors.incidentId
                            ? formik.errors.incidentId
                            : null
                        }
                        invalid={
                          formik.touched.incidentId && formik.errors.incidentId ? true : false
                        }
                        valid={formik.touched.incidentId && formik.errors.incidentId ? false : true}
                        disabled
                      />
                    </CCol>
                    <CCol md={12}>
                      <CFormInput
                        type="text"
                        label="RMA"
                        name="rmaId"
                        value={formik.values.rmaId}
                        onBlur={formik.handleBlur}
                        onChange={formik.handleChange}
                        feedbackInvalid={
                          formik.touched.rmaId && formik.errors.rmaId ? formik.errors.rmaId : null
                        }
                        invalid={formik.touched.rmaId && formik.errors.rmaId ? true : false}
                        valid={formik.touched.rmaId && formik.errors.rmaId ? false : true}
                        disabled
                      />
                    </CCol>
                    <CCol md={12}>
                      <CFormInput
                        type="text"
                        label="Delivered By"
                        name="deliveredBy"
                        value={formik.values.deliveredBy}
                        onBlur={formik.handleBlur}
                        onChange={formik.handleChange}
                        feedbackInvalid={
                          formik.touched.deliveredBy && formik.errors.deliveredBy
                            ? formik.errors.deliveredBy
                            : null
                        }
                        invalid={
                          formik.touched.deliveredBy && formik.errors.deliveredBy ? true : false
                        }
                        valid={
                          formik.touched.deliveredBy && formik.errors.deliveredBy ? false : true
                        }
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
                  label="Item Description"
                  name="itemDescription"
                  value={formik.values.itemDescription}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  feedbackInvalid={
                    formik.touched.itemDescription && formik.errors.itemDescription
                      ? formik.errors.itemDescription
                      : null
                  }
                  invalid={
                    formik.touched.itemDescription && formik.errors.itemDescription ? true : false
                  }
                  valid={
                    formik.touched.itemDescription && formik.errors.itemDescription ? false : true
                  }
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
                    formik.touched.quantity && formik.errors.quantity
                      ? formik.errors.quantity
                      : null
                  }
                  invalid={formik.touched.quantity && formik.errors.quantity ? true : false}
                  valid={formik.touched.quantity && formik.errors.quantity ? false : true}
                />
              </CCol>
              <CCol md={4}>
                <CFormInput
                  type="text"
                  label="Remarks"
                  name="remarks"
                  value={formik.values.remarks}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  feedbackInvalid={
                    formik.touched.remarks && formik.errors.remarks ? formik.errors.remarks : null
                  }
                  invalid={formik.touched.remarks && formik.errors.remarks ? true : false}
                  valid={formik.touched.remarks && formik.errors.remarks ? false : true}
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
                  valid={formik.touched.status && formik.errors.status ? false : true}
                >
                  <option>Select</option>
                  <option value={'Pending'}>Pending</option>
                  <option value={'Not PickedUp'}>Not PickedUp</option>
                  <option value={'In Transit'}>In Transit</option>
                  <option value={'Delivered'}>Delivered</option>
                  <option value={'Canceled'}>Canceled</option>
                </CFormSelect>
              </CCol>
              <CCol md={6}>
                <CFormInput
                  type="text"
                  label="Edit Remarks"
                  name="editRemarks"
                  value={formik.values.editRemarks}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  feedbackInvalid={
                    formik.touched.editRemarks && formik.errors.editRemarks
                      ? formik.errors.editRemarks
                      : null
                  }
                  invalid={formik.touched.editRemarks && formik.errors.editRemarks ? true : false}
                  valid={formik.touched.editRemarks && formik.errors.editRemarks ? false : true}
                />
              </CCol>
              <CCol md={2}>
                <CButton type="submit" size="sm" style={{ 'margin-top': '28px' }}>
                  Submit
                </CButton>
              </CCol>
            </CForm>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default Edit_Challan
