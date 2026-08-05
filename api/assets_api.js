import { apiUrl, tenant } from '@/lib/config'
import Swal from 'sweetalert2'
import { getUserDetails } from '@/lib/auth'

export const AddAssets = (asset, router, onSuccess) => {
  const details = getUserDetails()
  var myHeaders = new Headers()
  myHeaders.append('X-Tenant', '' + tenant + '')
  myHeaders.append('Content-Type', 'application/json')
  myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

  var raw = JSON.stringify({
    make: asset.make,
    model: asset.model,
    serialNumber: asset.serialNumber,
    purchaseOrderNumber: asset.purchaseOrderNumber,
    startDate: asset.startDate,
    endDate: asset.endDate,
    sla: asset.sla,
    assetType: asset.assetType,
    pinCode: asset.pinCode,
    city: asset.city,
    state: asset.state,
    address: asset.address,
    endClientId: asset.endClientId,
    userId: asset.userId,
  })

  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow',
  }

  fetch(apiUrl + '/auth/assets/add-assets', requestOptions)
    .then((response) => (response.status === 401 ? router.push('/') : response.json()))
    .then((result) => {
      if (result.statusCode === 200) {
        Swal.fire('Great!', '' + result.message + '', 'success').then(() => {
          if (onSuccess) {
            onSuccess()
          } else {
            router.push('/add-assets')
          }
        })
      } else {
        Swal.fire('Oops!', '' + result.message + '', 'warning')
      }
    })
    .catch((error) => console.log('error', error))
}

export const EditAsset = (asset, router, onSuccess) => {
  const details = getUserDetails()
  var myHeaders = new Headers()
  myHeaders.append('X-Tenant', '' + tenant + '')
  myHeaders.append('Content-Type', 'application/json')
  myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

  var raw = JSON.stringify({
    make: asset.make,
    model: asset.model,
    serialNumber: asset.serialNumber,
    purchaseOrderNumber: asset.purchaseOrderNumber,
    startDate: asset.startDate,
    endDate: asset.endDate,
    sla: asset.sla,
    assetType: asset.assetType,
    pinCode: asset.pinCode,
    city: asset.city,
    state: asset.state,
    address: asset.address,
    endClientId: asset.endClientId,
    userId: asset.userId,
  })
  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow',
  }

  fetch(
    apiUrl + '/auth/assets/edit-assets?remarks=' + asset.remarks + '&id=' + asset.id + '',
    requestOptions,
  )
    .then((response) => (response.status === 401 ? router.push('/') : response.json()))
    .then((result) => {
      if (result.statusCode === 200) {
        Swal.fire('Great!', '' + result.message + '', 'success').then(() => {
          if (onSuccess) {
            onSuccess()
          } else {
            router.push('/add-assets')
          }
        })
      } else {
        Swal.fire('Oops!', '' + result.message + '', 'warning')
      }
    })
    .catch((error) => console.log('error', error))
}

export const AddAssetReplacement = async (values, setVisible, router, assetList) => {
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
        '/auth/assets/add-asset-replacement?assetId=' +
        values.id +
        '&replacementSerial=' +
        values.replacementSerial +
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
        }).then((result) => {
          if (result.isConfirmed) {
            setVisible(false)
            router.push('/add-assets')
          } else {
            setVisible(false)
          }
        })
      } else {
        Swal.fire('Oops!', '' + data.message + '', 'warning')
      }
    }
  } catch (error) {
    console.log('error', error)
  }
}
