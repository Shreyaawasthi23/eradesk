import { apiUrl, tenant } from '@/lib/config'
import Swal from 'sweetalert2'
import { getUserDetails } from '@/lib/auth'

export const raiseRma = async (rma, router, setVisible, resetForm, setSubmitState) => {
  const details = getUserDetails()
  var myHeaders = new Headers()
  myHeaders.append('X-Tenant', '' + tenant + '')
  myHeaders.append('Content-Type', 'application/json')
  myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

  var raw = JSON.stringify({
    incidentRefId: rma.incidentRefId,
    endClientRefId: rma.endClientRefId,
    incidentId: rma.incidentId,
    make: rma.make,
    model: rma.model,
    serialNo: rma.serialNo,
    endClientName: rma.endClientName,
    contactName: rma.contactName,
    contactNumber: rma.contactNumber,
    contactEmail: rma.contactEmail,
    fullAddress: rma.fullAddress,
    city: rma.city,
    state: rma.state,
    pinCode: rma.pinCode,
    partNumber: rma.partNumber,
    description: rma.description,
    quantity: rma.quantity,
    userId: rma.userId,
    userEmail: rma.userEmail,
    purchaseOrderNumber: rma.purchaseOrderNumber,
  })

  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow',
  }
  try {
    const response = await fetch(apiUrl + '/auth/rma/create', requestOptions)
    if (response.status === 401) {
      router.push('/')
    } else {
      const data = await response.json()
      if (data.statusCode === 200) {
        Swal.fire({
          title: data.message,
          text: "RMA Raised now let's view RMA",
          icon: 'success',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'View',
        }).then((result) => {
          if (result.isConfirmed) {
            setVisible(false)
            setSubmitState(false)
            resetForm()
            router.push('/rma')
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

export const EditRma = (rma, router, setVisible, resetForm, setSubmitState) => {
  const details = getUserDetails()
  var myHeaders = new Headers()
  myHeaders.append('X-Tenant', '' + tenant + '')
  myHeaders.append('Content-Type', 'application/json')
  myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

  var raw = JSON.stringify({
    partNumber: rma.partNumber,
    description: rma.description,
    quantity: rma.quantity,
    status: rma.status,
    contactName: rma.contactName,
    contactNumber: rma.contactNumber,
    contactEmail: rma.contactEmail,
    userId: rma.userId,
  })
  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow',
  }

  fetch(apiUrl + '/auth/rma/edit?id=' + rma.id + '&remarks=' + rma.remarks + '', requestOptions)
    .then((response) => (response.status === 401 ? router.push('/') : response.json()))
    .then((result) => {
      if (result.statusCode === 200) {
        Swal.fire({
          title: result.message,
          text: "RMA Raised now let's view RMA",
          icon: 'success',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'View',
        }).then((result) => {
          if (result.isConfirmed) {
            setVisible(false)
            setSubmitState(false)
            resetForm()
          } else {
            setSubmitState(false)
            setVisible(false)
            resetForm()
          }
        })
      } else {
        Swal.fire('Oops!', '' + result.message + '', 'warning')
      }
    })
    .catch((error) => console.log('error', error))
}

export const UpdateRmaStatus = async (status, rmaId, router) => {
  const details = getUserDetails()
  try {
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    const requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    const response = await fetch(
      apiUrl +
        '/auth/rma/rma-status-update?rmaId=' +
        rmaId +
        '&status=' +
        status +
        '&userId=+' +
        details?.id +
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
          confirmButtonText: 'Done',
        })
      } else {
        Swal.fire('Oops!', '' + data.message + '', 'warning')
      }
    }
  } catch (error) {
    console.log('error', error)
  }
}

export const CreateRmaPurchase = async (
  purchaseDetails,
  router,
  setVisible,
  resetForm,
  setSubmitState,
) => {
  const details = getUserDetails()
  var myHeaders = new Headers()
  myHeaders.append('X-Tenant', '' + tenant + '')
  myHeaders.append('Content-Type', 'application/json')
  myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

  var raw = JSON.stringify({
    quantity: purchaseDetails.quantity,
    perUnitPrice: purchaseDetails.perUnitPrice,
    totalAmount: purchaseDetails.totalAmount,
    rmaRefId: purchaseDetails.rmaRefId,
    userId: purchaseDetails.userId,
    description: purchaseDetails.description,
  })

  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow',
  }
  try {
    const response = await fetch(apiUrl + '/auth/rma/create-purchase-rma', requestOptions)
    if (response.status === 401) {
      router.push('/')
    } else {
      const data = await response.json()
      if (data.statusCode === 200) {
        Swal.fire({
          title: 'Success!',
          text: data.message,
          icon: 'success',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'View',
        }).then((result) => {
          if (result.isConfirmed) {
            setVisible(false)
            setSubmitState(false)
            resetForm()
            router.push('/rma/view/' + purchaseDetails.rmaRefId)
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

export const EditRmaPurchase = (rmaPurchase, router, setVisible, resetForm, setSubmitState) => {
  const details = getUserDetails()
  var myHeaders = new Headers()
  myHeaders.append('X-Tenant', '' + tenant + '')
  myHeaders.append('Content-Type', 'application/json')
  myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

  var raw = JSON.stringify({
    quantity: rmaPurchase.quantity,
    perUnitPrice: rmaPurchase.perUnitPrice,
    totalAmount: rmaPurchase.totalAmount,
    rmaRefId: rmaPurchase.rmaRefId,
    userId: rmaPurchase.userId,
    description: rmaPurchase.description,
  })
  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow',
  }

  fetch(apiUrl + '/auth/rma/edit-purchase-rma?id=' + rmaPurchase.id + '', requestOptions)
    .then((response) => (response.status === 401 ? router.push('/') : response.json()))
    .then((result) => {
      if (result.statusCode === 200) {
        Swal.fire({
          title: 'Success!',
          text: result.message,
          icon: 'success',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'View',
        }).then((result) => {
          if (result.isConfirmed) {
            setVisible(false)
            setSubmitState(false)
            resetForm()
          } else {
            setSubmitState(false)
            setVisible(false)
            resetForm()
          }
        })
      } else {
        Swal.fire('Oops!', '' + result.message + '', 'warning')
      }
    })
    .catch((error) => console.log('error', error))
}
