import React, { useEffect, useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { EditUser } from '@/api/user_api'

import styles from './users.module.scss'

const rolesOptions = [
  { label: 'ROLE_ADMIN', value: 'admin' },
  { label: 'ROLE_MODERATOR', value: 'mod' },
  { label: 'ROLE_USER', value: 'user' },
  { label: 'ROLE_ENGINEER', value: 'engineer' },
]

const EditUserModal = ({ userId, router, onClose, onSaved }) => {
  const details = getUserDetails()
  const [user, setUser] = useState({})
  const [existingRoles, setExistingRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  const getUserDetailsFromApi = () => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    fetch(apiUrl + '/api/auth/users/get-user-details?id=' + userId, requestOptions)
      .then((response) => response.json())
      .then((result) => {
        setUser(result || {})
        if (result?.roles != null) {
          setExistingRoles(result.roles.map((role) => role.name))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      username: user.username,
      roles: [],
      password: user.password,
      firstName: user.firstName,
      lastName: user.lastName,
      userEmail: user.email,
      status: user.status,
      userId: details?.id,
      id: userId,
    },
    validationSchema: Yup.object({
      username: Yup.string().required('Required'),
      password: Yup.string().max(25, 'Must be 25 characters or less').required('Required'),
      firstName: Yup.string().required('Required'),
      lastName: Yup.string().required('Required'),
      status: Yup.boolean()
        .oneOf([true, false], 'Invalid input. Please select a value.')
        .required('Status is required'),
      userEmail: Yup.string().email('Invalid email address').required('Required'),
    }),
    onSubmit: (values) => {
      EditUser(values, router, () => {
        onSaved()
        onClose()
      })
    },
  })

  useEffect(() => {
    if (!userId) return
    getUserDetailsFromApi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Edit User</h2>
          <button type="button" className={styles.modalClose} onClick={onClose}>
            &times;
          </button>
        </div>
        {loading ? (
          <div className={styles.modalBody}>Loading...</div>
        ) : (
          <form onSubmit={formik.handleSubmit}>
            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Username</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.username || ''}
                    name="username"
                  />
                  {formik.touched.username && formik.errors.username && (
                    <span className={styles.formFeedbackInvalid}>{formik.errors.username}</span>
                  )}
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Email</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.userEmail || ''}
                    name="userEmail"
                  />
                  {formik.touched.userEmail && formik.errors.userEmail && (
                    <span className={styles.formFeedbackInvalid}>{formik.errors.userEmail}</span>
                  )}
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>First Name</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.firstName || ''}
                    name="firstName"
                  />
                  {formik.touched.firstName && formik.errors.firstName && (
                    <span className={styles.formFeedbackInvalid}>{formik.errors.firstName}</span>
                  )}
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Last Name</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.lastName || ''}
                    name="lastName"
                  />
                  {formik.touched.lastName && formik.errors.lastName && (
                    <span className={styles.formFeedbackInvalid}>{formik.errors.lastName}</span>
                  )}
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Password</label>
                  <div className={styles.passwordWrap}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className={styles.formInput}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.password || ''}
                      name="password"
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                    </button>
                  </div>
                  {formik.touched.password && formik.errors.password && (
                    <span className={styles.formFeedbackInvalid}>{formik.errors.password}</span>
                  )}
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Status</label>
                  <select
                    className={styles.filterSelect}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.status ?? ''}
                    name="status"
                  >
                    <option value="">Select</option>
                    <option value={true}>Active</option>
                    <option value={false}>Deactive</option>
                  </select>
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>New Roles</label>
                  <select
                    className={styles.filterSelect}
                    value={formik.values.roles}
                    onChange={(e) => {
                      const selectedRoles = Array.from(e.target.selectedOptions, (o) => o.value)
                      formik.setFieldValue('roles', selectedRoles)
                    }}
                    multiple
                  >
                    {rolesOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Existing Roles</label>
                  <div className={styles.roleBadges}>
                    {existingRoles.map((role) => (
                      <span key={role} className={styles.roleBadge}>
                        {role.replace('ROLE_', '')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={styles.submitBtn}>
                Save Changes
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default EditUserModal
