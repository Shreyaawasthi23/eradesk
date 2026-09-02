import React, { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { CreateUser } from '@/apiClients/user_api'
import { useRouter } from 'next/router'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'

import styles from './users.module.scss'
import EditUserModal from './EditUserModal'
import Pagination from '@/components/ui/Pagination'

const rolesOptions = ['admin', 'mod', 'user', 'engineer']
const avatarPalette = ['#2E86DE', '#22C58B', '#8E44AD', '#F4623A', '#17A2A8', '#D35400']

const initials = (name) => (name ? name.charAt(0).toUpperCase() : '?')

const emptyUser = {
  username: '',
  email: '',
  roles: [],
  password: '',
  firstName: '',
  lastName: '',
}

const Users = () => {
  const [user, setUser] = useState(emptyUser)
  const details = getUserDetails()
  const [usernameCheck, setUsernameCheck] = useState('')
  const [usernameMessage, setUsernameMessage] = useState('')
  const [emailCheck, setEmailCheck] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [userList, setUserList] = useState({})
  const [currentPage, setCurrentPage] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [editUserId, setEditUserId] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  // Filters
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  function handleInputChange(e) {
    setUser({ ...user, [e.target.name]: e.target.value })
  }

  const SelectItem = (id, e) => {
    const isChecked = e.target.checked
    setUser((prev) => ({
      ...prev,
      roles: isChecked ? [...prev.roles, id] : prev.roles.filter((r) => r !== id),
    }))
  }

  const checkUsername = (e) => {
    handleInputChange(e)
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    fetch(apiUrl + '/api/auth/core/users/check-username?username=' + e.target.value + '', requestOptions)
      .then((response) => (response.status === 401 ? router.push('/') : response.json()))
      .then((result) => {
        if (result.statusCode === 200) {
          setUsernameCheck(true)
          setUsernameMessage(result.message)
        } else {
          setUsernameCheck(false)
          setUsernameMessage(result.message)
        }
      })
      .catch((error) => {})
  }

  const emailFormatRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const checkEmail = (e) => {
    handleInputChange(e)
    const email = e.target.value

    if (!email) {
      setEmailCheck('')
      setEmailMessage('')
      return
    }
    if (!emailFormatRegex.test(email)) {
      setEmailCheck(false)
      setEmailMessage('Invalid email address')
      return
    }

    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    fetch(apiUrl + '/api/auth/core/users/check-email?email=' + email + '', requestOptions)
      .then((response) => (response.status === 401 ? router.push('/') : response.json()))
      .then((result) => {
        if (result.statusCode === 200) {
          setEmailCheck(true)
          setEmailMessage(result.message)
        } else {
          setEmailCheck(false)
          setEmailMessage(result.message)
        }
      })
      .catch((error) => {})
  }

  const buildFilterQuery = (filters) => {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.role) params.set('role', filters.role)
    if (filters.startDate) params.set('startDate', filters.startDate)
    if (filters.endDate) params.set('endDate', filters.endDate)
    return params.toString()
  }

  const getUsers = (
    page,
    size,
    filters = { search, role: roleFilter, startDate, endDate },
  ) => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    const filterQuery = buildFilterQuery(filters)
    const url =
      apiUrl +
      '/api/auth/core/users/get-users?page=' +
      page +
      '&size=' +
      size +
      (filterQuery ? '&' + filterQuery : '')

    fetch(url, requestOptions)
      .then((response) => (response.status === 401 ? router.push('/') : response.json()))
      .then((result) => {
        if (result !== null) {
          setUserList(result)
        }
      })
      .catch((error) => {})
  }

  const gotToPage = (pageNo) => {
    getUsers(pageNo, 10)
    setCurrentPage(pageNo)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!emailFormatRegex.test(user.email)) {
      setEmailCheck(false)
      setEmailMessage('Invalid email address')
      return
    }
    if (!user.roles.length) {
      Swal.fire('Oops!', 'Please select at least one role.', 'warning')
      return
    }
    await CreateUser(user, router, () => getUsers(currentPage, 10))
    setShowModal(false)
    setUser(emptyUser)
    setUsernameCheck('')
    setUsernameMessage('')
    setEmailCheck('')
    setEmailMessage('')
  }

  const editUser = (id) => {
    setEditUserId(id)
  }

  const applyFilters = () => {
    setCurrentPage(0)
    getUsers(0, 10)
  }

  const clearFilters = () => {
    setSearch('')
    setRoleFilter('')
    setStartDate('')
    setEndDate('')
    setCurrentPage(0)
    getUsers(0, 10, { search: '', role: '', startDate: '', endDate: '' })
  }

  useEffect(() => {
    getUsers(0, 10)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Users</h1>
          <p className={styles.pageSubtitle}>Manage users, roles, and access</p>
        </div>
        <button type="button" className={styles.addBtn} onClick={() => setShowModal(true)}>
          + Add New User
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.filterBar}>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Search</label>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="Username or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Role</label>
            <select
              className={styles.filterSelect}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All roles</option>
              <option value="ROLE_ADMIN">Admin</option>
              <option value="ROLE_MODERATOR">Moderator</option>
              <option value="ROLE_USER">User</option>
              <option value="ROLE_ENGINEER">Engineer</option>
            </select>
          </div>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Created From</label>
            <input
              type="date"
              className={styles.filterInput}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Created To</label>
            <input
              type="date"
              className={styles.filterInput}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button type="button" className={styles.applyBtn} onClick={applyFilters}>
            Apply
          </button>
          <button type="button" className={styles.filterClear} onClick={clearFilters}>
            Clear
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>User</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Status</th>
                <th>Create Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {userList.content?.map((option, index) => (
                <tr key={option.id}>
                  <td>{userList.number * userList.size + index}</td>
                  <td>
                    <div className={styles.userCell}>
                      <div
                        className={styles.avatar}
                        style={{ background: avatarPalette[index % avatarPalette.length] }}
                      >
                        {initials(option.username)}
                      </div>
                      <span className={styles.username}>{option.username}</span>
                    </div>
                  </td>
                  <td className={styles.email}>{option.email}</td>
                  <td>
                    <div className={styles.roleBadges}>
                      {option.roles?.map((r) => (
                        <span key={r.id} className={styles.roleBadge}>
                          {r.name?.replace('ROLE_', '')}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={option.status ? styles.statusActive : styles.statusInactive}>
                      {option.status ? 'Active' : 'Deactive'}
                    </span>
                  </td>
                  <td className={styles.email}>{option.createDate}</td>
                  <td>
                    <button type="button" className={styles.editBtn} onClick={() => editUser(option.id)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {userList.content?.length === 0 && <div className={styles.emptyState}>No users found</div>}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={userList.totalPages}
          onPageChange={gotToPage}
          styles={styles}
        />
      </div>

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>New User</h2>
              <button type="button" className={styles.modalClose} onClick={() => setShowModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Username</label>
                    <input
                      type="text"
                      className={
                        usernameCheck === ''
                          ? styles.formInput
                          : usernameCheck
                            ? styles.formInputValid
                            : styles.formInputInvalid
                      }
                      value={user.username}
                      required
                      name="username"
                      onChange={checkUsername}
                    />
                    {usernameMessage && (
                      <span
                        className={usernameCheck ? styles.formFeedbackValid : styles.formFeedbackInvalid}
                      >
                        {usernameMessage}
                      </span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Email</label>
                    <input
                      type="text"
                      className={
                        emailCheck === ''
                          ? styles.formInput
                          : emailCheck
                            ? styles.formInputValid
                            : styles.formInputInvalid
                      }
                      value={user.email}
                      required
                      name="email"
                      onChange={checkEmail}
                    />
                    {emailMessage && (
                      <span className={emailCheck ? styles.formFeedbackValid : styles.formFeedbackInvalid}>
                        {emailMessage}
                      </span>
                    )}
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>First Name</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={user.firstName}
                      required
                      name="firstName"
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Last Name</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={user.lastName}
                      required
                      name="lastName"
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Password</label>
                    <div className={styles.passwordWrap}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className={styles.formInput}
                        value={user.password}
                        required
                        name="password"
                        onChange={handleInputChange}
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
                  </div>
                  <div className={`${styles.formField} ${styles.full}`}>
                    <label className={styles.formLabel}>Roles</label>
                    <div className={styles.roleGrid}>
                      {rolesOptions.map((option) => (
                        <label key={option} className={styles.roleCheck}>
                          <input type="checkbox" onChange={(e) => SelectItem(option, e)} />
                          {option.toUpperCase()}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.submitBtn}>
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editUserId && (
        <EditUserModal
          userId={editUserId}
          router={router}
          onClose={() => setEditUserId(null)}
          onSaved={() => getUsers(currentPage, 10)}
        />
      )}
    </div>
  )
}

export default Users
