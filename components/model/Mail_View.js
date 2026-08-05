/* eslint-disable react/prop-types */
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'
import React from 'react'
import moment from 'moment'

// eslint-disable-next-line react/prop-types
const Mail_View = ({ visible, setVisible, item, ...props }) => {
  const htmlContent = { __html: item?.body?.content }
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
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <CModalTitle>Mail Body</CModalTitle>
          <p>
            <b>From:</b> {item?.from?.emailAddress?.name}, {item?.from?.emailAddress?.address}
          </p>
          <p>
            <b>Sent:</b> {formatDate(item?.sentDateTime)} {formatTime(item?.sentDateTime)}
          </p>
          <p>
            <b>To:</b>{' '}
            {item?.toRecipients?.map(
              (recipient) =>
                recipient.emailAddress.name + ' ' + recipient.emailAddress.address + ',' + ' ',
            )}
          </p>
          <p>
            <b>CC:</b>{' '}
            {item?.ccRecipients?.map(
              (recipient) =>
                recipient.emailAddress.name + ' ' + recipient.emailAddress.address + ',' + ' ',
            )}
          </p>
          <p>
            <b>Subject:</b> {item?.subject}
          </p>
        </div>
      </CModalHeader>
      <CModalBody>
        <div dangerouslySetInnerHTML={htmlContent}></div>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={() => setVisible(false)}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default Mail_View
