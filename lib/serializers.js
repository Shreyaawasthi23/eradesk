export function serializeFrontClient(c) {
  return {
    id: c._id.toString(),
    name: c.name,
    contactName: c.contactName,
    contactNumber: c.contactNumber,
    contactEmail: c.contactEmail,
    gstNumber: c.gstNumber,
    panNumber: c.panNumber,
    address: c.address,
    pinCode: c.pinCode,
    city: c.city,
    state: c.state,
    country: c.country,
    frontClientId: c.frontClientId,
    createDate: c.createDate,
    modifyDate: c.modifyDate,
    userName: c.userName,
    userId: c.userId,
    status: c.status,
    salesIds: c.salesIds || [],
  }
}

export function serializeAsset(a) {
  return {
    id: a._id.toString(),
    make: a.make,
    model: a.model,
    serialNumber: a.serialNumber,
    purchaseOrderNumber: a.purchaseOrderNumber,
    startDate: a.startDate,
    endDate: a.endDate,
    sla: a.sla,
    assetType: a.assetType,
    pinCode: a.pinCode,
    city: a.city,
    state: a.state,
    address: a.address,
    endClientId: a.endClientId,
    frontClientId: a.frontClientId,
    purchaseId: a.purchaseId,
    assetId: a.assetId,
    replacedSerial: a.replacedSerial,
    replaced: a.replaced,
    replacementHistory: a.replacementHistory || [],
    userId: a.userId,
    userName: a.userName,
    createDate: a.createDate,
    modifyDate: a.modifyDate,
  }
}

export function serializePurchase(p) {
  return {
    id: p._id.toString(),
    endClientId: p.endClientId,
    frontClientId: p.frontClientId,
    purchaseOrderNumber: p.purchaseOrderNumber,
    contactName: p.contactName,
    contactNumber: p.contactNumber,
    contactEmail: p.contactEmail,
    startDate: p.startDate,
    endDate: p.endDate,
    poReceiveDate: p.poReceiveDate,
    type: p.type,
    purchaseId: p.purchaseId,
    createDate: p.createDate,
    modifyDate: p.modifyDate,
    userName: p.userName,
    userId: p.userId,
    status: p.status,
    value: p.value,
    salesId: p.salesId,
  }
}

export function serializeIncident(i) {
  return {
    id: i._id.toString(),
    incidentId: i.incidentId,
    incidentDate: i.incidentDate,
    serialNumber: i.serialNumber,
    problem: i.problem,
    make: i.make,
    model: i.model,
    priority: i.priority,
    assetType: i.assetType,
    engineerId: i.engineerId,
    poType: i.poType,
    contactName: i.contactName,
    contactEmail: i.contactEmail,
    contactNumber: i.contactNumber,
    status: i.status,
    state: i.state,
    city: i.city,
    pinCode: i.pinCode,
    fullAddress: i.fullAddress,
    purchaseOrderNumber: i.purchaseOrderNumber,
    sla: i.sla,
    slaTime: i.slaTime,
    endClientId: i.endClientId,
    endClientName: i.endClientName,
    frontClientId: i.frontClientId,
    frontClientName: i.frontClientName,
    createDate: i.createDate,
    closeDate: i.closeDate,
    modifyDate: i.modifyDate,
    userId: i.userId,
    userEmail: i.userEmail,
  }
}

export function serializeIncidentNote(n) {
  return {
    id: n._id.toString(),
    note: n.note,
    incidentId: n.incidentId,
    userId: n.userId,
    userEmail: n.userEmail,
    createDate: n.createDate,
    additionalDetails: n.additionalDetails,
  }
}

export function serializeRma(r) {
  return {
    id: r._id.toString(),
    incidentRefId: r.incidentRefId,
    endClientRefId: r.endClientRefId,
    incidentId: r.incidentId,
    make: r.make,
    model: r.model,
    serialNo: r.serialNo,
    endClientName: r.endClientName,
    contactName: r.contactName,
    contactNumber: r.contactNumber,
    contactEmail: r.contactEmail,
    fullAddress: r.fullAddress,
    city: r.city,
    state: r.state,
    pinCode: r.pinCode,
    partNumber: r.partNumber,
    description: r.description,
    quantity: r.quantity,
    userId: r.userId,
    userEmail: r.userEmail,
    createDate: r.createDate,
    modifyDate: r.modifyDate,
    rmaId: r.rmaId,
    status: r.status,
    purchaseOrderNumber: r.purchaseOrderNumber,
  }
}

export function serializeRmaPod(p) {
  return {
    id: p._id.toString(),
    rmaNo: p.rmaNo,
    rmaId: p.rmaId,
    image: p.image
      ? {
          fileName: p.image.fileName,
          data: { data: p.image.data },
        }
      : null,
    userId: p.userId,
    userEmail: p.userEmail,
    createDate: p.createDate,
  }
}

export function serializeRmaPurchase(p) {
  return {
    id: p._id.toString(),
    quantity: p.quantity,
    perUnitPrice: p.perUnitPrice,
    totalAmount: p.totalAmount,
    description: p.description,
    rmaRefId: p.rmaRefId,
    rmaId: p.rmaId,
    endClientRefId: p.endClientRefId,
    endClientName: p.endClientName,
    purchaseOrderNumber: p.purchaseOrderNumber,
    incidentRefId: p.incidentRefId,
    incidentId: p.incidentId,
    createDate: p.createDate,
    modifyDate: p.modifyDate,
    userId: p.userId,
  }
}

export function serializeChallan(c) {
  return {
    id: c._id.toString(),
    fromName: c.fromName,
    fromAddressLane: c.fromAddressLane,
    fromAddressLaneExt: c.fromAddressLaneExt,
    fromGst: c.fromGst,
    fromContact: c.fromContact,
    toName: c.toName,
    toAddressLane: c.toAddressLane,
    toAddressLaneExt: c.toAddressLaneExt,
    toContactName: c.toContactName,
    toContact: c.toContact,
    challanNo: c.challanNo,
    date: c.date,
    poNumber: c.poNumber,
    rmaId: c.rmaId,
    rmaRefId: c.rmaRefId,
    incidentId: c.incidentId,
    incidentRefId: c.incidentRefId,
    deliveredBy: c.deliveredBy,
    itemDescription: c.itemDescription,
    quantity: c.quantity,
    remarks: c.remarks,
    createDate: c.createDate,
    modifyDate: c.modifyDate,
    userEmail: c.userEmail,
    userId: c.userId,
    status: c.status,
    deliveryStatus: c.deliveryStatus,
  }
}

export function serializeDeliveryTracking(t) {
  return {
    id: t._id.toString(),
    challanId: t.challanId,
    challanNo: t.challanNo,
    status: t.status,
    email: t.email,
    userId: t.userId,
    createDate: t.createDate,
  }
}

export function serializePodDetails(p) {
  return {
    id: p._id.toString(),
    challanNo: p.challanNo,
    challanId: p.challanId,
    image: p.image
      ? {
          fileName: p.image.fileName,
          data: { data: p.image.data },
        }
      : null,
    userId: p.userId,
    userEmail: p.userEmail,
    createDate: p.createDate,
  }
}

export function serializeEndClient(c) {
  return {
    id: c._id.toString(),
    name: c.name,
    contactName: c.contactName,
    contactNumber: c.contactNumber,
    contactEmail: c.contactEmail,
    endClientId: c.endClientId,
    frontClientId: c.frontClientId,
    createDate: c.createDate,
    modifyDate: c.modifyDate,
    userName: c.userName,
    userId: c.userId,
    status: c.status,
    salesIds: c.salesIds || [],
  }
}
