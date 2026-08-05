import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import PropTypes from 'prop-types'

import { CBadge } from '@coreui/react'

const NavLink = React.forwardRef(({ href, className, children, ...rest }, ref) => {
  const router = useRouter()
  const isActive = href && router.pathname === href
  return (
    <Link
      href={href}
      ref={ref}
      className={[className, isActive ? 'active' : ''].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </Link>
  )
})
NavLink.displayName = 'NavLink'

export const AppSidebarNav = ({ items }) => {
  const router = useRouter()
  const navLink = (name, icon, badge) => {
    return (
      <>
        {icon && icon}
        {name && name}
        {badge && (
          <CBadge color={badge.color} className="ms-auto">
            {badge.text}
          </CBadge>
        )}
      </>
    )
  }

  const navItem = (item, index) => {
    const { component, name, badge, icon, ...rest } = item
    const Component = component
    return (
      <Component
        {...(rest.to &&
          !rest.items && {
            component: NavLink,
            href: rest.to,
          })}
        key={index}
        {...rest}
      >
        {navLink(name, icon, badge)}
      </Component>
    )
  }
  const navGroup = (item, index) => {
    const { component, name, icon, to, ...rest } = item
    const Component = component
    return (
      <Component
        idx={String(index)}
        key={index}
        toggler={navLink(name, icon)}
        visible={router.pathname.startsWith(to)}
        {...rest}
      >
        {item.items?.map((item, index) =>
          item.items ? navGroup(item, index) : navItem(item, index),
        )}
      </Component>
    )
  }

  return (
    <React.Fragment>
      {items &&
        items.map((item, index) => (item.items ? navGroup(item, index) : navItem(item, index)))}
    </React.Fragment>
  )
}

AppSidebarNav.propTypes = {
  items: PropTypes.arrayOf(PropTypes.any).isRequired,
}
