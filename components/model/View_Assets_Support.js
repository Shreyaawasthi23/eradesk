/* eslint-disable react/prop-types */
import {
  CButton,
  CCardBody,
  CCol,
  CForm,
  CFormInput,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import React from 'react'
import moment from 'moment'

const View_Assets_Support = ({ visible, setVisible, details, ...props }) => {
  const formatDate = (date) => {
    return moment(date).format('DD/MM/YYYY')
  }

  const formatTime = (date) => {
    return moment(date).format('hh:mm A')
  }

  return (
    <CModal
      size="xl"
      alignment="center"
      visible={visible}
      onClose={() => setVisible(false)}
      backdrop="static"
      scrollable
    >
      <CModalHeader>
        <CModalTitle>Asset - #{details.assetId}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div style={{ textAlign: 'center' }}>
          {details.replaced ? (
            <b style={{ fontSize: '20px' }}>
              This Asset is Replaced By Serial -{' '}
              <span style={{ color: 'red' }}>{details.replacedSerial}</span>
            </b>
          ) : (
            ''
          )}
        </div>
        <br />
        <CForm className="row g-3">
          <CCol md={6}>
            <CFormInput
              type="text"
              label="Serial No."
              name="serialNumber"
              value={details.serialNumber}
              disabled
            />
          </CCol>
          <CCol md={6}>
            <CFormInput
              type="text"
              label="Purchase Order Number"
              name="purchaseOrderNumber"
              value={details.purchaseOrderNumber}
              disabled
            />
          </CCol>
          <CCol md={4}>
            <CFormInput
              type="text"
              label="Service Start Date"
              name="startDate"
              value={formatDate(details.startDate)}
              disabled
            />
          </CCol>
          <CCol md={4}>
            <CFormInput
              type="text"
              label="Service End Date"
              name="endDate"
              value={formatDate(details.endDate)}
              disabled
            />
          </CCol>
          <CCol md={4}>
            <CFormInput
              type="text"
              label="Asset Type"
              name="assetType"
              value={details.assetType}
              disabled
            />
          </CCol>
          <CCol md={4}>
            <CFormInput type="text" label="City" name="city" value={details.city} disabled />
          </CCol>
          <CCol md={4}>
            <CFormInput type="text" label="State" name="state" value={details.state} disabled />
          </CCol>
          <CCol md={4}>
            <CFormInput
              type="text"
              label="PinCode"
              name="pinCode"
              value={details.pinCode}
              disabled
            />
          </CCol>
          <CCol md={6}>
            <CFormInput
              type="text"
              label="Address"
              name="address"
              value={details.address}
              disabled
            />
          </CCol>
          <CCol md={6}>
            <CFormInput type="text" label="SLA" name="sla" value={details.sla} disabled />
          </CCol>
        </CForm>
      </CModalBody>
      <CModalFooter>
        <div style={{ fontSize: '13px' }}>
          Create by <b>{details.userName}</b> at <b>{formatTime(details.createDate)}</b> on{' '}
          <b>{formatDate(details.createDate)}</b>
        </div>
        <CButton color="secondary" onClick={() => setVisible(false)}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default View_Assets_Support
