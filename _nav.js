import CIcon from '@coreui/icons-react'
import {
  cilBell,
  cilCalculator,
  cilChartPie,
  cilCursor,
  cilDescription,
  cilDrop,
  cilNotes,
  cilPencil,
  cilPuzzle,
  cilSpeedometer,
  cilStar,
} from '@coreui/icons'
import { CNavGroup, CNavItem, CNavTitle } from '@coreui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUsers,
  faBuildingUser,
  faFileInvoiceDollar,
  faLifeRing,
  faHeadset,
  faArrowsRotate,
  faTruckMoving,
  faDatabase,
  faEnvelopeOpenText,
  faClockRotateLeft,
} from '@fortawesome/free-solid-svg-icons'
import { getUserDetails } from '@/lib/auth'

const _nav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
    badge: {
      color: 'info',
      text: 'NEW',
    },
  },
  {
    component: CNavTitle,
    name: 'Admin',
  },
  {
    component: CNavItem,
    name: 'Users',
    to: '/users',
    icon: <FontAwesomeIcon icon={faUsers} className="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: 'Client',
    to: '',
    // eslint-disable-next-line no-undef
    icon: <FontAwesomeIcon icon={faBuildingUser} className="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Front Client',
        to: '/create-front-client',
      },
      {
        component: CNavItem,
        name: 'End Client',
        to: '/create-end-client',
      },
      {
        component: CNavItem,
        name: 'Purchase Order',
        to: '/create-purchase',
      },
      {
        component: CNavItem,
        name: 'Assets',
        to: '/add-assets',
      },
    ],
  },
  {
    component: CNavTitle,
    name: 'Support',
  },
  {
    component: CNavItem,
    name: 'Incident',
    to: '/incident',
    icon: <FontAwesomeIcon icon={faLifeRing} className="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Service Request',
    to: '/incident',
    icon: <FontAwesomeIcon icon={faHeadset} className="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'RMA',
    to: '/rma',
    icon: <FontAwesomeIcon icon={faArrowsRotate} className="nav-icon" />,
  },
]

const admin_nav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
    badge: {
      color: 'info',
      text: 'NEW',
    },
  },
  {
    component: CNavTitle,
    name: 'Admin',
  },
  {
    component: CNavGroup,
    name: 'Users',
    to: '',
    // eslint-disable-next-line no-undef
    icon: <FontAwesomeIcon icon={faUsers} className="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Users',
        to: '/users',
      },
      {
        component: CNavItem,
        name: 'Sales Team',
        to: '/add-sales-participent',
      },
    ],
  },
  {
    component: CNavGroup,
    name: 'Client',
    to: '',
    // eslint-disable-next-line no-undef
    icon: <FontAwesomeIcon icon={faBuildingUser} className="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Front Client',
        to: '/create-front-client',
      },
      {
        component: CNavItem,
        name: 'End Client',
        to: '/create-end-client',
      },
      {
        component: CNavItem,
        name: 'Purchase Order',
        to: '/create-purchase',
      },
    ],
  },
  {
    component: CNavGroup,
    name: 'CMDB',
    to: '',
    // eslint-disable-next-line no-undef
    icon: <FontAwesomeIcon icon={faDatabase} className="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Assets',
        to: '/add-assets',
      },
    ],
  },
  {
    component: CNavItem,
    name: 'Purchase Order',
    to: '/purchase-orders',
    icon: <FontAwesomeIcon icon={faFileInvoiceDollar} className="nav-icon" />,
  },
  {
    component: CNavTitle,
    name: 'Support',
  },
  {
    component: CNavItem,
    name: 'Incident',
    to: '/incident',
    icon: <FontAwesomeIcon icon={faLifeRing} className="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Service Request',
    to: '/incident',
    icon: <FontAwesomeIcon icon={faHeadset} className="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'RMA',
    to: '/rma',
    icon: <FontAwesomeIcon icon={faArrowsRotate} className="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Challan',
    to: '/view-challans',
    icon: <FontAwesomeIcon icon={faTruckMoving} className="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: 'CMDB',
    to: '',
    // eslint-disable-next-line no-undef
    icon: <FontAwesomeIcon icon={faDatabase} className="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Assets',
        to: '/view-assets',
      },
    ],
  },
  {
    component: CNavItem,
    name: 'Email Settings',
    to: '/email-settings',
    icon: <FontAwesomeIcon icon={faEnvelopeOpenText} className="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Logs',
    to: '/logs',
    icon: <FontAwesomeIcon icon={faClockRotateLeft} className="nav-icon" />,
  },
]

const mod_nav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
    badge: {
      color: 'info',
      text: 'NEW',
    },
  },
  {
    component: CNavTitle,
    name: 'Manager',
  },
  {
    component: CNavItem,
    name: 'Incident',
    to: '/incident',
    icon: <FontAwesomeIcon icon={faLifeRing} className="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Service Request',
    to: '/incident',
    icon: <FontAwesomeIcon icon={faHeadset} className="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'RMA',
    to: '/rma',
    icon: <FontAwesomeIcon icon={faArrowsRotate} className="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Challan',
    to: '/view-challans',
    icon: <FontAwesomeIcon icon={faTruckMoving} className="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: 'CMDB',
    to: '',
    // eslint-disable-next-line no-undef
    icon: <FontAwesomeIcon icon={faDatabase} className="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Assets',
        to: '/view-assets',
      },
    ],
  },
]

const support_nav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
    badge: {
      color: 'info',
      text: 'NEW',
    },
  },
  {
    component: CNavTitle,
    name: 'Support',
  },
  {
    component: CNavItem,
    name: 'Incident',
    to: '/incident',
    icon: <FontAwesomeIcon icon={faLifeRing} className="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Service Request',
    to: '/incident',
    icon: <FontAwesomeIcon icon={faHeadset} className="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'RMA',
    to: '/rma',
    icon: <FontAwesomeIcon icon={faArrowsRotate} className="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Challan',
    to: '/view-challans',
    icon: <FontAwesomeIcon icon={faTruckMoving} className="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: 'CMDB',
    to: '',
    // eslint-disable-next-line no-undef
    icon: <FontAwesomeIcon icon={faDatabase} className="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Assets',
        to: '/view-assets',
      },
    ],
  },
]
const engg_nav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
    badge: {
      color: 'info',
      text: 'NEW',
    },
  },
  {
    component: CNavTitle,
    name: 'Engineer',
  },
  {
    component: CNavItem,
    name: 'Incident',
    to: '/incident',
    icon: <FontAwesomeIcon icon={faLifeRing} className="nav-icon" />,
  },
]

export const getNav = () => {
  const details = getUserDetails()
  if (!details?.roles) return []
  if (details.roles.includes('ROLE_ADMIN')) return admin_nav
  if (details.roles.includes('ROLE_MODERATOR')) return mod_nav
  if (details.roles.includes('ROLE_USER')) return support_nav
  if (details.roles.includes('ROLE_ENGINEER')) return engg_nav
  return []
}

export default _nav
