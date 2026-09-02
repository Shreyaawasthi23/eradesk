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

export function serializeKnowledgeArticle(a) {
  return {
    id: a._id.toString(),
    articleId: a.articleId,
    title: a.title,
    description: a.description,
    category: a.category,
    tags: a.tags || [],
    status: a.status,
    visibility: a.visibility,
    version: a.version,
    viewCount: a.viewCount || 0,
    helpfulCount: a.helpfulCount || 0,
    notHelpfulCount: a.notHelpfulCount || 0,
    authorId: a.authorId,
    authorName: a.authorName,
    publishedDate: a.publishedDate,
    createDate: a.createDate,
    modifyDate: a.modifyDate,
    userId: a.userId,
    userEmail: a.userEmail,
  }
}

export function serializeProblem(p) {
  return {
    id: p._id.toString(),
    problemId: p.problemId,
    title: p.title,
    description: p.description,
    priority: p.priority,
    status: p.status,
    symptoms: p.symptoms,
    rootCause: p.rootCause,
    workaround: p.workaround,
    knownError: p.knownError || false,
    permanentSolution: p.permanentSolution,
    closureNotes: p.closureNotes,
    linkedIncidentIds: p.linkedIncidentIds || [],
    linkedChangeIds: p.linkedChangeIds || [],
    engineerId: p.engineerId,
    workGroup: p.workGroup,
    createDate: p.createDate,
    modifyDate: p.modifyDate,
    closeDate: p.closeDate,
    userId: p.userId,
    userEmail: p.userEmail,
  }
}

export function serializeChange(c2) {
  return {
    id: c2._id.toString(),
    changeId: c2.changeId,
    title: c2.title,
    description: c2.description,
    type: c2.type,
    priority: c2.priority,
    riskLevel: c2.riskLevel,
    status: c2.status,
    impactAnalysis: c2.impactAnalysis,
    implementationPlan: c2.implementationPlan,
    backoutPlan: c2.backoutPlan,
    testPlan: c2.testPlan,
    scheduledStart: c2.scheduledStart,
    scheduledEnd: c2.scheduledEnd,
    linkedIncidentIds: c2.linkedIncidentIds || [],
    linkedProblemIds: c2.linkedProblemIds || [],
    approvals: c2.approvals || [],
    engineerId: c2.engineerId,
    workGroup: c2.workGroup,
    closureNotes: c2.closureNotes,
    reviewNotes: c2.reviewNotes,
    createDate: c2.createDate,
    modifyDate: c2.modifyDate,
    closeDate: c2.closeDate,
    userId: c2.userId,
    userEmail: c2.userEmail,
  }
}

export function serializeRelease(r) {
  return {
    id: r._id.toString(),
    releaseId: r.releaseId,
    title: r.title,
    description: r.description,
    version: r.version,
    type: r.type,
    status: r.status,
    plannedDate: r.plannedDate,
    deployedDate: r.deployedDate,
    testNotes: r.testNotes,
    rollbackPlan: r.rollbackPlan,
    postReleaseReview: r.postReleaseReview,
    linkedChangeIds: r.linkedChangeIds || [],
    linkedProblemIds: r.linkedProblemIds || [],
    linkedIncidentIds: r.linkedIncidentIds || [],
    engineerId: r.engineerId,
    workGroup: r.workGroup,
    createDate: r.createDate,
    modifyDate: r.modifyDate,
    closeDate: r.closeDate,
    userId: r.userId,
    userEmail: r.userEmail,
  }
}

export function serializeConfigurationItem(ci) {
  return {
    id: ci._id.toString(),
    ciId: ci.ciId,
    name: ci.name,
    type: ci.type,
    status: ci.status,
    assetId: ci.assetId || null,
    ipAddress: ci.ipAddress,
    macAddress: ci.macAddress,
    operatingSystem: ci.operatingSystem,
    version: ci.version,
    owner: ci.owner,
    vendor: ci.vendor,
    description: ci.description,
    createDate: ci.createDate,
    modifyDate: ci.modifyDate,
    userId: ci.userId,
    userEmail: ci.userEmail,
  }
}

export function serializeCIRelationship(r) {
  return {
    id: r._id.toString(),
    sourceId: r.sourceId,
    targetId: r.targetId,
    relationshipType: r.relationshipType,
    createDate: r.createDate,
    userId: r.userId,
    userEmail: r.userEmail,
  }
}

export function serializeDiscoveryJob(j) {
  return {
    id: j._id.toString(),
    jobId: j.jobId,
    name: j.name,
    cidr: j.cidr,
    schedule: j.schedule,
    status: j.status,
    lastRunDate: j.lastRunDate,
    deviceCount: j.deviceCount || 0,
    createDate: j.createDate,
    modifyDate: j.modifyDate,
    userId: j.userId,
    userEmail: j.userEmail,
  }
}

export function serializeDiscoveredDevice(d) {
  return {
    id: d._id.toString(),
    discoveryJobId: d.discoveryJobId,
    ip: d.ip,
    hostname: d.hostname,
    mac: d.mac,
    os: d.os,
    deviceType: d.deviceType,
    manufacturer: d.manufacturer,
    model: d.model,
    status: d.status,
    promotedCIId: d.promotedCIId || null,
    discoveredDate: d.discoveredDate,
  }
}

export function serializeSoftware(s) {
  return {
    id: s._id.toString(),
    softwareId: s.softwareId,
    name: s.name,
    publisher: s.publisher,
    category: s.category,
    createDate: s.createDate,
    modifyDate: s.modifyDate,
    userId: s.userId,
    userEmail: s.userEmail,
  }
}

export function serializeSoftwareLicense(l) {
  return {
    id: l._id.toString(),
    licenseId: l.licenseId,
    softwareId: l.softwareId,
    softwareName: l.softwareName,
    licenseKey: l.licenseKey,
    totalSeats: l.totalSeats,
    usedSeats: l.usedSeats || 0,
    vendor: l.vendor,
    cost: l.cost,
    purchaseDate: l.purchaseDate,
    expiryDate: l.expiryDate,
    status: l.status,
    createDate: l.createDate,
    modifyDate: l.modifyDate,
    userId: l.userId,
    userEmail: l.userEmail,
  }
}

export function serializeSoftwareInstallation(i) {
  return {
    id: i._id.toString(),
    licenseId: i.licenseId,
    ciId: i.ciId || null,
    assetId: i.assetId || null,
    userId: i.installedUserId || null,
    deviceLabel: i.deviceLabel,
    installDate: i.installDate,
    userEmail: i.userEmail,
  }
}

export function serializeVendor(v) {
  return {
    id: v._id.toString(),
    vendorId: v.vendorId,
    name: v.name,
    contactPerson: v.contactPerson,
    email: v.email,
    phone: v.phone,
    address: v.address,
    website: v.website,
    status: v.status,
    createDate: v.createDate,
    modifyDate: v.modifyDate,
    userId: v.userId,
    userEmail: v.userEmail,
  }
}

export function serializeContract(c) {
  return {
    id: c._id.toString(),
    contractId: c.contractId,
    vendorId: c.vendorId,
    vendorName: c.vendorName,
    type: c.type,
    description: c.description,
    startDate: c.startDate,
    endDate: c.endDate,
    renewalDate: c.renewalDate,
    cost: c.cost,
    status: c.status,
    linkedAssetIds: c.linkedAssetIds || [],
    createDate: c.createDate,
    modifyDate: c.modifyDate,
    userId: c.userId,
    userEmail: c.userEmail,
  }
}

export function serializeApprovalRequest(a) {
  return {
    id: a._id.toString(),
    approvalId: a.approvalId,
    entityType: a.entityType,
    entityId: a.entityId,
    entityLabel: a.entityLabel,
    mode: a.mode,
    status: a.status,
    steps: (a.steps || []).map((s) => ({
      order: s.order,
      approverId: s.approverId,
      approverEmail: s.approverEmail,
      status: s.status,
      comment: s.comment,
      decidedDate: s.decidedDate,
    })),
    requestedById: a.requestedById,
    requestedByEmail: a.requestedByEmail,
    createDate: a.createDate,
    modifyDate: a.modifyDate,
  }
}

export function serializeAuditLog(l) {
  return {
    id: l._id.toString(),
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    entityLabel: l.entityLabel,
    userId: l.userId,
    userEmail: l.userEmail,
    ipAddress: l.ipAddress,
    changes: l.changes || [],
    reason: l.reason || '',
    timestamp: l.timestamp,
  }
}

export function serializeNotification(n) {
  return {
    id: n._id.toString(),
    userId: n.userId,
    type: n.type,
    title: n.title,
    message: n.message,
    link: n.link || null,
    read: n.read || false,
    createDate: n.createDate,
  }
}

export function serializeSurveyTemplate(t) {
  return {
    id: t._id.toString(),
    templateId: t.templateId,
    title: t.title,
    description: t.description,
    questions: (t.questions || []).map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type,
      options: q.options || [],
    })),
    triggerDelayHours: t.triggerDelayHours,
    active: t.active !== false,
    createDate: t.createDate,
    modifyDate: t.modifyDate,
    userId: t.userId,
    userEmail: t.userEmail,
  }
}

export function serializeSurveyResponse(r) {
  return {
    id: r._id.toString(),
    templateId: r.templateId,
    templateTitle: r.templateTitle,
    incidentId: r.incidentId,
    incidentRefId: r.incidentRefId,
    respondentEmail: r.respondentEmail,
    status: r.status,
    answers: (r.answers || []).map((a) => ({
      questionId: a.questionId,
      questionText: a.questionText,
      value: a.value,
    })),
    scheduledSendDate: r.scheduledSendDate,
    sentDate: r.sentDate,
    submittedDate: r.submittedDate,
    createDate: r.createDate,
  }
}

export function serializeAnnouncement(a) {
  return {
    id: a._id.toString(),
    announcementId: a.announcementId,
    title: a.title,
    description: a.description,
    priority: a.priority,
    startDate: a.startDate,
    endDate: a.endDate,
    audience: a.audience,
    source: a.source || 'MANUAL',
    sourceId: a.sourceId || null,
    createDate: a.createDate,
    modifyDate: a.modifyDate,
    userId: a.userId,
    userEmail: a.userEmail,
  }
}

export function serializeMaintenanceWindow(m) {
  return {
    id: m._id.toString(),
    windowId: m.windowId,
    name: m.name,
    description: m.description,
    startDate: m.startDate,
    endDate: m.endDate,
    servicesAffected: m.servicesAffected || [],
    sitesAffected: m.sitesAffected || [],
    status: m.status,
    announcementId: m.announcementId || null,
    createDate: m.createDate,
    modifyDate: m.modifyDate,
    userId: m.userId,
    userEmail: m.userEmail,
  }
}

export function serializeSlaPolicy(p) {
  return {
    id: p._id.toString(),
    policyId: p.policyId,
    name: p.name,
    entityType: p.entityType,
    targets: p.targets || [],
    active: p.active !== false,
    createDate: p.createDate,
    modifyDate: p.modifyDate,
    userId: p.userId,
    userEmail: p.userEmail,
  }
}

export function serializeHoliday(h) {
  return {
    id: h._id.toString(),
    date: h.date,
    name: h.name,
  }
}

export function serializeBusinessRule(r) {
  return {
    id: r._id.toString(),
    ruleId: r.ruleId,
    name: r.name,
    entityType: r.entityType,
    trigger: r.trigger,
    conditions: r.conditions || [],
    actions: r.actions || [],
    priority: r.priority ?? 0,
    enabled: r.enabled !== false,
    continueAfterMatch: r.continueAfterMatch !== false,
    createDate: r.createDate,
    modifyDate: r.modifyDate,
    userId: r.userId,
    userEmail: r.userEmail,
  }
}

export function serializeCatalogItem(i) {
  return {
    id: i._id.toString(),
    itemId: i.itemId,
    name: i.name,
    description: i.description,
    category: i.category,
    formFields: i.formFields || [],
    approvalRequired: i.approvalRequired || false,
    approverIds: i.approverIds || [],
    slaHours: i.slaHours,
    assignmentGroup: i.assignmentGroup,
    cost: i.cost,
    active: i.active !== false,
    createDate: i.createDate,
    modifyDate: i.modifyDate,
    userId: i.userId,
    userEmail: i.userEmail,
  }
}

export function serializeServiceRequest(r) {
  return {
    id: r._id.toString(),
    requestId: r.requestId,
    catalogItemId: r.catalogItemId,
    catalogItemName: r.catalogItemName,
    formData: r.formData || {},
    status: r.status,
    approvalRequestId: r.approvalRequestId || null,
    assignmentGroup: r.assignmentGroup,
    engineerId: r.engineerId,
    requesterId: r.requesterId,
    requesterEmail: r.requesterEmail,
    closureNotes: r.closureNotes,
    createDate: r.createDate,
    modifyDate: r.modifyDate,
    closeDate: r.closeDate,
  }
}

export function serializeMonitoringIntegration(m) {
  return {
    id: m._id.toString(),
    integrationId: m.integrationId,
    name: m.name,
    defaultWorkGroup: m.defaultWorkGroup,
    defaultPriority: m.defaultPriority,
    active: m.active !== false,
    eventCount: m.eventCount || 0,
    lastEventDate: m.lastEventDate || null,
    createDate: m.createDate,
    userId: m.userId,
    userEmail: m.userEmail,
  }
}

export function serializeSavedReport(r) {
  return {
    id: r._id.toString(),
    reportId: r.reportId,
    name: r.name,
    dataSource: r.dataSource,
    fields: r.fields || [],
    filters: r.filters || [],
    groupBy: r.groupBy || null,
    sortBy: r.sortBy || null,
    sortDirection: r.sortDirection || 'ASC',
    createDate: r.createDate,
    userId: r.userId,
    userEmail: r.userEmail,
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
