import { apiUrl, tenant } from '@/lib/config'
import Swal from 'sweetalert2'
import { getUserDetails } from '@/lib/auth'

export const createChallan = async (challan, router, setVisible, resetForm, setSubmitState) => {
  const details = getUserDetails()
  var myHeaders = new Headers()
  myHeaders.append('X-Tenant', '' + tenant + '')
  myHeaders.append('Content-Type', 'application/json')
  myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

  var raw = JSON.stringify({
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
    status: challan.status,
    userId: challan.userId,
  })

  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow',
  }
  try {
    const response = await fetch(apiUrl + '/auth/core/challan/create', requestOptions)
    if (response.status === 401) {
      router.push('/')
    } else {
      const data = await response.json()
      if (data.statusCode === 200) {
        Swal.fire({
          title: data.message,
          text: 'Do you want to print it ?',
          icon: 'success',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Yes',
        }).then((result) => {
          if (result.isConfirmed) {
            setVisible(false)
            setSubmitState(false)
            resetForm()
            router.push('/view-challans')
          } else {
            setSubmitState(false)
            setVisible(false)
            resetForm()
          }
        })
      } else {
        Swal.fire('Oops!', '' + data.message + '', 'warning')
      }
    }
  } catch (error) {
    console.error('Error fetching data:', error)
  }
}

export const updateChallan = async (challan, router) => {
  const details = getUserDetails()
  var myHeaders = new Headers()
  myHeaders.append('X-Tenant', '' + tenant + '')
  myHeaders.append('Content-Type', 'application/json')
  myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

  var raw = JSON.stringify({
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
    incidentId: challan.incidentId,
    deliveredBy: challan.deliveredBy,
    itemDescription: challan.itemDescription,
    quantity: challan.quantity,
    remarks: challan.remarks,
    status: challan.status,
    userId: challan.userId,
  })

  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow',
  }

  try {
    const response = await fetch(
      apiUrl + '/auth/core/challan/edit?id=' + challan.id + '&remarks=' + challan.editRemarks + '',
      requestOptions,
    )
    const result = await response.json()
    if (result.statusCode === 200) {
      Swal.fire({
        title: result.message,
        text: 'Go Back ?',
        icon: 'success',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes',
      }).then((result) => {
        if (result.isConfirmed) {
          router.push('/view-challans')
        } else {
        }
      })
    } else {
      Swal.fire('Oops!', '' + result.message + '', 'warning')
    }
  } catch (error) {
    console.log('error', error)
  }
}

export const addChallanTracking = async (values, resetForm, router, setVisible) => {
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
    const response = await fetch(
      apiUrl +
        '/auth/core/challan/add-delivery-status?id=' +
        values.challanId +
        '&status=' +
        values.status +
        '&userId=' +
        values.userId +
        '',
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
            setVisible(false)
            resetForm()
            router.push('/view-challans')
          } else {
            setVisible(false)
            resetForm()
          }
        })
      } else {
        Swal.fire('Oops!', '' + data.message + '', 'warning')
      }
    }
  } catch (error) {
    console.error('Error fetching data:', error)
  }
}
