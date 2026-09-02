import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import MyIcon from '@/assets/images/logo-new.png'
import Barcode from 'react-barcode'
import moment from 'moment'
import { CButton } from '@coreui/react'

const Challan_Print = () => {
  const router = useRouter()
  const { id } = router.query
  const [challan, setChallan] = useState({})
  const getChalanDetails = async () => {
    const details = getUserDetails()
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
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setChallan(data)
          // console.log(data)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }
  const formatDate = (date) => {
    return moment(date).format('DD MMMM, YYYY')
  }
  const containerStyle = {
    fontSize: '12px',
  }

  const h1Style = {
    textAlign: 'center',
    margin: '20px 0',
  }

  const h2Style = {
    textAlign: 'center',
    textDecoration: 'underline',
  }

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
  }

  const tdStyle = {
    width: '50%',
    border: '1px solid #aaa',
    padding: '20px',
    verticalAlign: 'top',
  }

  const logoWrapperStyle = {
    overflow: 'auto',
  }

  const logoStyle = {
    float: 'left',
    marginRight: '88px',
    marginLeft: '-24px',
  }

  const companyDetailsStyle = {
    float: 'left',
  }

  const companyNameStyle = {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '8px',
  }

  const gstinStyle = {
    marginBottom: '20px',
  }

  const contactStyle = {
    marginBottom: '8px',
  }

  const barcodeWrapperStyle = {
    marginBottom: '20px',
    overflow: 'auto',
  }

  const barcodeStyle = {
    float: 'left',
  }

  const deliveredByStyle = {
    marginBottom: '8px',
    color: '#ff0000',
  }

  const deliveryDetailsStyle = {
    marginBottom: '8px',
    textDecoration: 'underline',
  }

  const itemDescriptionStyle = {
    borderRight: '1px solid #aaa',
    borderBottom: '1px solid #aaa',
    padding: '5px',
  }

  const qtyStyle = {
    borderRight: '1px solid #aaa',
    borderBottom: '1px solid #aaa',
    padding: '5px',
    width: '80px',
  }

  const remarkStyle = {
    borderBottom: '1px solid #aaa',
    padding: '5px',
    width: '250px',
  }

  const totalStyle = {
    border: '1px solid #aaa',
    padding: '5px',
  }

  const termsSectionStyle = {
    minHeight: '250px',
    borderLeft: '1px solid #aaa',
    borderRight: '1px solid #aaa',
  }

  const termsTdStyle = {
    border: '1px solid #aaa',
    padding: '20px',
  }

  const boldStyle = {
    fontWeight: 'bold',
  }

  const signatureStyle = {
    width: '200px',
    height: '200px',
    margin: '0 auto',
    border: '1px dashed #ccc',
    borderRadius: '50%',
  }

  useEffect(() => {
    if (!id) return
    getChalanDetails()
    window.addEventListener('load', handlePrint)

    return () => {
      window.removeEventListener('load', handlePrint)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  const handlePrint = () => {
    window.print() // Trigger window print
  }
  return (
    <>
      <div style={containerStyle} id="print-content">
        <h1 style={h1Style}>LRS SERVICES PRIVATE LIMITED</h1>
        <h2 style={h2Style}>Delivery Challan</h2>
        <div style={{ width: '900px', margin: '35px auto' }}>
          <table style={tableStyle}>
            <tr>
              <td style={tdStyle}>
                <div style={logoWrapperStyle}>
                  <div style={logoStyle}>
                    <img src={MyIcon.src ?? MyIcon} height="65" alt="Logo" />
                  </div>
                  <div style={companyDetailsStyle}>
                    <div style={companyNameStyle}>LRS Services Private Limited</div>
                    <div>{challan.fromAddressLane}</div>
                    <div>{challan.fromAddressLaneExt}</div>
                  </div>
                </div>
                <div style={gstinStyle}>
                  GSTIN NO : <b>{challan.fromGst}</b>
                </div>
                <div style={contactStyle}>
                  MOBILE : <b>{challan.fromContact}</b>
                </div>
              </td>
              <td style={tdStyle}>
                <div style={barcodeWrapperStyle}>
                  <div style={barcodeStyle}>
                    <Barcode value={challan.challanNo} width={1} height={50} />
                  </div>
                  <div style={{ float: 'right' }}>
                    <div>
                      <b>{formatDate(challan.date)}</b>
                    </div>
                  </div>
                </div>
                <div id="delivered-by" style={deliveredByStyle}>
                  <b>Shipped By : {challan.deliveredBy}</b>
                </div>
              </td>
            </tr>
            <tr>
              <td style={tdStyle}>
                <div style={deliveryDetailsStyle}>Delivery @</div>
                <div style={{ marginBottom: '8px' }}>
                  <div style={companyNameStyle}>{challan.toName}</div>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <div>{challan.toAddressLane}</div>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <div>{challan.toAddressLaneExt}</div>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <div>
                    <b>PO # : {challan.poNumber}</b>
                  </div>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <div>
                    <b>Ticket ID :</b> {challan.incidentId}
                  </div>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ lineHeight: '20px' }}></div>
                </div>
              </td>
              <td style={tdStyle}>
                <div style={deliveryDetailsStyle}>To,</div>
                <div style={{ marginBottom: '8px' }}>
                  Contact : <b>{challan.toContactName}</b>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  TEL : <b>{challan.toContact}</b>
                </div>
              </td>
            </tr>
          </table>
          <div style={termsSectionStyle}>
            <table id="itms-table" style={tableStyle}>
              <tbody>
                <tr>
                  <th style={itemDescriptionStyle}>ITEM DESCRIPTION</th>
                  <th style={qtyStyle}>QTY.</th>
                  <th style={remarkStyle}>REMARK</th>
                </tr>
                <tr>
                  <td style={itemDescriptionStyle}>
                    <div style={{ lineHeight: '20px' }}>{challan.itemDescription}</div>
                  </td>
                  <td style={qtyStyle}>
                    <div style={{ lineHeight: '20px', textAlign: 'center' }}>
                      {challan.quantity}
                    </div>
                  </td>
                  <td style={remarkStyle}>
                    <div style={{ lineHeight: '20px' }}>{challan.remarks}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <table style={{ ...tableStyle, border: '1px solid #aaa' }}>
            <tr>
              <th style={{ ...totalStyle, width: '80px' }}>TOTAL</th>
              <th style={totalStyle}>
                <div style={{ textAlign: 'center' }}>{challan.quantity}</div>
              </th>
              <th style={{ ...totalStyle, width: '250px' }}></th>
            </tr>
          </table>
          <table style={{ ...tableStyle, border: '1px solid #aaa', tableLayout: 'fixed' }}>
            <tr>
              <td style={termsTdStyle}>
                <div style={boldStyle}>
                  TERMS AND CONDITIONS
                  <br />
                  <br />
                  Please Return the copy duly signed
                  <br />
                  <br />
                  This is online generated DC no need for a physical stamp
                </div>
              </td>
              <td style={termsTdStyle}>
                <div style={signatureStyle}></div>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </>
  )
}

export default Challan_Print
