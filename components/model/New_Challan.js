/* eslint-disable react/prop-types */
import React, { useState } from 'react'
import * as Yup from 'yup'
import { useFormik } from 'formik'
import { useRouter } from 'next/router'
import { getUserDetails } from '@/lib/auth'
import { createChallan } from '@/api/challan_api'
import CappedSelect from '@/components/ui/CappedSelect'

import styles from '@/views/rma/rma.module.scss'

const fromCompanyOptions = [
  { value: '1', label: 'LRS Services Private Limited — Delhi' },
  { value: '2', label: 'LRS Services Private Limited — UP' },
]

const New_Challan = ({ visible, setVisible, rma }) => {
  const router = useRouter()
  const details = getUserDetails()
  const [submitState, setSubmitState] = useState(false)

  const handelFromCompany = (e, formik) => {
    formik.setFieldValue('fromCompanyId', e.target.value)
    if (e.target.value === '1') {
      formik.setFieldValue('fromName', 'LRS Services Private Limited')
      formik.setFieldValue('fromAddressLane', 'First Floor, C-4/39, Lane No-3, Sadatpur Extn')
      formik.setFieldValue('fromAddressLaneExt', 'Karawal Nagar, Delhi-110094')
      formik.setFieldValue('fromGst', '07AACCL6399N1ZQ')
      formik.setFieldValue('fromContact', '9899448062, 9821042253')
    } else if (e.target.value === '2') {
      formik.setFieldValue('fromName', 'LRS Services Private Limited')
      formik.setFieldValue('fromAddressLane', 'A-26, Sector 63, NOIDA')
      formik.setFieldValue('fromAddressLaneExt', 'UP 201301')
      formik.setFieldValue('fromGst', '09AACCL6399N1ZM')
      formik.setFieldValue('fromContact', '9899448062, 9821042253')
    }
  }

  const handleDateChange = (e, formik) => {
    const inputValue = e.target.value
    const selectedDate = inputValue ? new Date(inputValue) : new Date()
    formik.setFieldValue('date', new Date(selectedDate.getTime()))
  }

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      fromCompanyId: '',
      fromName: '',
      fromAddressLane: '',
      fromAddressLaneExt: '',
      fromGst: '',
      fromContact: '',
      toName: rma.endClientName,
      toAddressLane: rma.fullAddress,
      toAddressLaneExt: '',
      toContactName: rma.contactName,
      toContact: rma.contactNumber,
      date: '',
      poNumber: rma.purchaseOrderNumber,
      rmaId: rma.rmaId,
      rmaRefId: rma.id,
      incidentId: rma.incidentId,
      incidentRefId: rma.incidentRefId,
      deliveredBy: '',
      itemDescription: rma.description,
      quantity: rma.quantity,
      remarks: '',
      status: null,
      userId: details?.id,
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
      toName: Yup.string().max(200, 'Must be 200 characters or less').required('Required'),
      toAddressLane: Yup.string().max(200, 'Must be 200 characters or less').required('Required'),
      toAddressLaneExt: Yup.string().max(100, 'Must be 100 characters or less'),
      toContactName: Yup.string().max(30, 'Must be 30 characters or less').required('Required'),
      toContact: Yup.string()
        .min(10, 'Must be 10 characters')
        .max(25, 'Must not be more than 25 characters')
        .required('Required'),
      date: Yup.string().required('Required'),
      poNumber: Yup.string().max(100, 'Must be 100 characters or less').required('Required'),
      rmaId: Yup.string().max(30, 'Must be 30 characters or less').required('Required'),
      rmaRefId: Yup.string().required('Required'),
      incidentId: Yup.string().required('Required'),
      incidentRefId: Yup.string().required('Required'),
      deliveredBy: Yup.string().max(30, 'Must be 30 characters or less').required('Required'),
      itemDescription: Yup.string().max(300, 'Must be 300 characters or less').required('Required'),
      quantity: Yup.number().required('Required'),
      remarks: Yup.string().max(300, 'Must be 300 characters or less').required('Required'),
      userId: Yup.string().max(30, 'Must be 30 characters or less').required('Required'),
    }),
    onSubmit: (values, { resetForm }) => {
      setSubmitState(true)
      createChallan(values, router, setVisible, resetForm, setSubmitState)
    },
  })

  if (!visible) return null

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalWide} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Challan Against #{rma.rmaId}</h2>
          <button type="button" className={styles.modalClose} onClick={() => setVisible(false)}>
            &times;
          </button>
        </div>
        <form onSubmit={formik.handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.sectionGrid}>
              <div className={styles.sectionCard}>
                <h3 className={styles.sectionTitle}>From</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>From Company</label>
                    <CappedSelect
                      value={formik.values.fromCompanyId}
                      onChange={(e) => handelFromCompany(e, formik)}
                      onBlur={formik.handleBlur}
                      options={fromCompanyOptions}
                    />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Address Lane 1</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      name="fromAddressLane"
                      value={formik.values.fromAddressLane}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched.fromAddressLane && formik.errors.fromAddressLane && (
                      <span className={styles.formFeedbackInvalid}>
                        {formik.errors.fromAddressLane}
                      </span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Address Lane 2</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      name="fromAddressLaneExt"
                      value={formik.values.fromAddressLaneExt}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>GSTTIN</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      name="fromGst"
                      value={formik.values.fromGst}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched.fromGst && formik.errors.fromGst && (
                      <span className={styles.formFeedbackInvalid}>{formik.errors.fromGst}</span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Contact Number</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      name="fromContact"
                      value={formik.values.fromContact}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.sectionCard}>
                <h3 className={styles.sectionTitle}>To</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Company Name</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      name="toName"
                      value={formik.values.toName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Address Lane 1</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      name="toAddressLane"
                      value={formik.values.toAddressLane}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Address Lane 2</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      name="toAddressLaneExt"
                      value={formik.values.toAddressLaneExt}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Contact Person</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      name="toContactName"
                      value={formik.values.toContactName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Contact Number</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      name="toContact"
                      value={formik.values.toContact}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.sectionCard}>
                <h3 className={styles.sectionTitle}>Other Info</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Date</label>
                    <input
                      type="date"
                      className={styles.formInput}
                      onChange={(e) => handleDateChange(e, formik)}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched.date && formik.errors.date && (
                      <span className={styles.formFeedbackInvalid}>{formik.errors.date}</span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>PO Number</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={formik.values.poNumber}
                      disabled
                    />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Incident</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={formik.values.incidentId}
                      disabled
                    />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>RMA</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={formik.values.rmaId}
                      disabled
                    />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Delivered By</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      name="deliveredBy"
                      value={formik.values.deliveredBy}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched.deliveredBy && formik.errors.deliveredBy && (
                      <span className={styles.formFeedbackInvalid}>
                        {formik.errors.deliveredBy}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Item Description</label>
                <input
                  type="text"
                  className={styles.formInput}
                  name="itemDescription"
                  value={formik.values.itemDescription}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Quantity</label>
                <input
                  type="text"
                  className={styles.formInput}
                  name="quantity"
                  value={formik.values.quantity}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </div>
              <div className={`${styles.formField} ${styles.full}`}>
                <label className={styles.formLabel}>Remarks</label>
                <input
                  type="text"
                  className={styles.formInput}
                  name="remarks"
                  value={formik.values.remarks}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.remarks && formik.errors.remarks && (
                  <span className={styles.formFeedbackInvalid}>{formik.errors.remarks}</span>
                )}
              </div>
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={() => setVisible(false)}>
              Close
            </button>
            <button type="submit" className={styles.submitBtn} disabled={submitState}>
              {submitState ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default New_Challan
