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
  faBook,
  faShuffle,
  faClipboardCheck,
  faBullhorn,
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
    name: 'Service Catalog',
    to: '/catalog',
    icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: 'ITIL',
    to: '',
    // eslint-disable-next-line no-undef
    icon: <FontAwesomeIcon icon={faShuffle} className="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Problems',
        to: '/problem',
      },
      {
        component: CNavItem,
        name: 'Changes',
        to: '/change',
      },
      {
        component: CNavItem,
        name: 'Releases',
        to: '/release',
      },
    ],
  },
  {
    component: CNavGroup,
    name: 'Vendors & Contracts',
    to: '',
    // eslint-disable-next-line no-undef
    icon: <FontAwesomeIcon icon={faFileInvoiceDollar} className="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Vendors',
        to: '/vendor',
      },
      {
        component: CNavItem,
        name: 'Contracts',
        to: '/contract',
      },
    ],
  },
  {
    component: CNavItem,
    name: 'RMA',
    to: '/rma',
    icon: <FontAwesomeIcon icon={faArrowsRotate} className="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Knowledge Base',
    to: '/knowledge',
    icon: <FontAwesomeIcon icon={faBook} className="nav-icon" />,
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
    component: CNavItem,
    name: 'Approvals',
    to: '/approvals',
    icon: <FontAwesomeIcon icon={faClipboardCheck} className="nav-icon" />,
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
    name: 'Service Catalog',
    to: '/catalog',
    icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: 'ITIL',
    to: '',
    // eslint-disable-next-line no-undef
    icon: <FontAwesomeIcon icon={faShuffle} className="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Problems',
        to: '/problem',
      },
      {
        component: CNavItem,
        name: 'Changes',
        to: '/change',
      },
      {
        component: CNavItem,
        name: 'Releases',
        to: '/release',
      },
    ],
  },
  {
    component: CNavGroup,
    name: 'Vendors & Contracts',
    to: '',
    // eslint-disable-next-line no-undef
    icon: <FontAwesomeIcon icon={faFileInvoiceDollar} className="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Vendors',
        to: '/vendor',
      },
      {
        component: CNavItem,
        name: 'Contracts',
        to: '/contract',
      },
    ],
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
      {
        component: CNavItem,
        name: 'Configuration Items',
        to: '/cmdb',
      },
      {
        component: CNavItem,
        name: 'Asset Discovery',
        to: '/discovery',
      },
      {
        component: CNavItem,
        name: 'Software',
        to: '/software',
      },
    ],
  },
  {
    component: CNavItem,
    name: 'Surveys',
    to: '/survey',
    icon: <CIcon icon={cilStar} customClassName="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: 'Communications',
    to: '',
    // eslint-disable-next-line no-undef
    icon: <FontAwesomeIcon icon={faBullhorn} className="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Announcements',
        to: '/announcement',
      },
      {
        component: CNavItem,
        name: 'Maintenance Windows',
        to: '/maintenance',
      },
    ],
  },
  {
    component: CNavItem,
    name: 'Report Builder',
    to: '/reports',
    icon: <CIcon icon={cilChartPie} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Knowledge Base',
    to: '/knowledge',
    icon: <FontAwesomeIcon icon={faBook} className="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Email Settings',
    to: '/email-settings',
    icon: <FontAwesomeIcon icon={faEnvelopeOpenText} className="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'SLA Configuration',
    to: '/sla',
    icon: <CIcon icon={cilCalculator} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Business Rules',
    to: '/rules',
    icon: <CIcon icon={cilPuzzle} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Monitoring Integrations',
    to: '/monitoring',
    icon: <CIcon icon={cilDrop} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Logs',
    to: '/logs',
    icon: <FontAwesomeIcon icon={faClockRotateLeft} className="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Audit Log',
    to: '/audit',
    icon: <FontAwesomeIcon icon={faClipboardCheck} className="nav-icon" />,
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
    component: CNavItem,
    name: 'Approvals',
    to: '/approvals',
    icon: <FontAwesomeIcon icon={faClipboardCheck} className="nav-icon" />,
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
    name: 'Service Catalog',
    to: '/catalog',
    icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: 'ITIL',
    to: '',
    // eslint-disable-next-line no-undef
    icon: <FontAwesomeIcon icon={faShuffle} className="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Problems',
        to: '/problem',
      },
      {
        component: CNavItem,
        name: 'Changes',
        to: '/change',
      },
      {
        component: CNavItem,
        name: 'Releases',
        to: '/release',
      },
    ],
  },
  {
    component: CNavGroup,
    name: 'Vendors & Contracts',
    to: '',
    // eslint-disable-next-line no-undef
    icon: <FontAwesomeIcon icon={faFileInvoiceDollar} className="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Vendors',
        to: '/vendor',
      },
      {
        component: CNavItem,
        name: 'Contracts',
        to: '/contract',
      },
    ],
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
      {
        component: CNavItem,
        name: 'Configuration Items',
        to: '/cmdb',
      },
      {
        component: CNavItem,
        name: 'Asset Discovery',
        to: '/discovery',
      },
      {
        component: CNavItem,
        name: 'Software',
        to: '/software',
      },
    ],
  },
  {
    component: CNavItem,
    name: 'Surveys',
    to: '/survey',
    icon: <CIcon icon={cilStar} customClassName="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: 'Communications',
    to: '',
    // eslint-disable-next-line no-undef
    icon: <FontAwesomeIcon icon={faBullhorn} className="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Announcements',
        to: '/announcement',
      },
      {
        component: CNavItem,
        name: 'Maintenance Windows',
        to: '/maintenance',
      },
    ],
  },
  {
    component: CNavItem,
    name: 'Report Builder',
    to: '/reports',
    icon: <CIcon icon={cilChartPie} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Knowledge Base',
    to: '/knowledge',
    icon: <FontAwesomeIcon icon={faBook} className="nav-icon" />,
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
    component: CNavItem,
    name: 'Approvals',
    to: '/approvals',
    icon: <FontAwesomeIcon icon={faClipboardCheck} className="nav-icon" />,
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
    name: 'Service Catalog',
    to: '/catalog',
    icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: 'ITIL',
    to: '',
    // eslint-disable-next-line no-undef
    icon: <FontAwesomeIcon icon={faShuffle} className="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Problems',
        to: '/problem',
      },
      {
        component: CNavItem,
        name: 'Changes',
        to: '/change',
      },
      {
        component: CNavItem,
        name: 'Releases',
        to: '/release',
      },
    ],
  },
  {
    component: CNavGroup,
    name: 'Vendors & Contracts',
    to: '',
    // eslint-disable-next-line no-undef
    icon: <FontAwesomeIcon icon={faFileInvoiceDollar} className="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Vendors',
        to: '/vendor',
      },
      {
        component: CNavItem,
        name: 'Contracts',
        to: '/contract',
      },
    ],
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
      {
        component: CNavItem,
        name: 'Configuration Items',
        to: '/cmdb',
      },
      {
        component: CNavItem,
        name: 'Asset Discovery',
        to: '/discovery',
      },
      {
        component: CNavItem,
        name: 'Software',
        to: '/software',
      },
    ],
  },
  {
    component: CNavItem,
    name: 'Surveys',
    to: '/survey',
    icon: <CIcon icon={cilStar} customClassName="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: 'Communications',
    to: '',
    // eslint-disable-next-line no-undef
    icon: <FontAwesomeIcon icon={faBullhorn} className="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Announcements',
        to: '/announcement',
      },
      {
        component: CNavItem,
        name: 'Maintenance Windows',
        to: '/maintenance',
      },
    ],
  },
  {
    component: CNavItem,
    name: 'Knowledge Base',
    to: '/knowledge',
    icon: <FontAwesomeIcon icon={faBook} className="nav-icon" />,
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
    component: CNavItem,
    name: 'Approvals',
    to: '/approvals',
    icon: <FontAwesomeIcon icon={faClipboardCheck} className="nav-icon" />,
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
  {
    component: CNavItem,
    name: 'Knowledge Base',
    to: '/knowledge',
    icon: <FontAwesomeIcon icon={faBook} className="nav-icon" />,
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
