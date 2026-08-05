import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { login } from '@/api/login_api'
import Cookies from 'js-cookie'

import styles from './login.module.scss'

const Login = () => {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  const clearCookies = () => {
    Cookies.remove('userLogin')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearCookies()
    await login(username, password, router)
  }

  useEffect(() => {
    clearCookies()
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.formSide}>
          <div className={styles.logoRow}>
            <img src="/logo (2).png" alt="ERADESK" className={styles.logoImg} />
          </div>

          <h1 className={styles.heading}>
            Hello,
            <br />
            Welcome Back
          </h1>
          {/* <p className={styles.subtitle}>Hey, welcome back to your special place</p> */}

          <form className={styles.form} onSubmit={handleSubmit}>
            <input
              className={styles.input}
              placeholder="Username"
              autoComplete="username"
              value={username}
              required
              onChange={(e) => setUsername(e.target.value)}
            />
            <div className={styles.passwordWrap}>
              <input
                className={styles.input}
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            <div className={styles.optionsRow}>
              <label className={styles.rememberLabel}>
                <input
                  type="checkbox"
                  className={styles.rememberCheckbox}
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
              <a className={styles.forgotLink} href="#">
                Forgot Password?
              </a>
            </div>

            <button type="submit" className={styles.loginBtn}>
              Sign In
            </button>
          </form>

          <p className={styles.signupFooter}>
            Don&apos;t have an account?{' '}
            <Link href="/register" className={styles.signupFooterLink}>
              Sign Up
            </Link>
          </p>
        </div>

        <div className={styles.brandSide}>
          <span className={styles.brandShapeOne} />
          <span className={styles.brandShapeTwo} />
          <div className={styles.brandMark}>ED</div>
          <h2 className={styles.brandTitle}>ERADESK</h2>
          <p className={styles.brandText}>
            Manage incidents, assets, purchase orders and RMAs in one place.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
