// Route metadata (path + name) used by AppBreadcrumb.
// `.element` entries are added incrementally as each view is ported
// (see migration plan Phase 2/3) -- this file intentionally does not
// reference not-yet-created view modules.
const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/theme', name: 'Theme', exact: true },
  { path: '/theme/colors', name: 'Colors' },
  { path: '/theme/typography', name: 'Typography' },
  { path: '/base', name: 'Base', exact: true },
  { path: '/base/accordion', name: 'Accordion' },
  { path: '/base/breadcrumbs', name: 'Breadcrumbs' },
  { path: '/base/cards', name: 'Cards' },
  { path: '/base/carousels', name: 'Carousel' },
  { path: '/base/collapses', name: 'Collapse' },
  { path: '/base/list-groups', name: 'List Groups' },
  { path: '/base/navs', name: 'Navs' },
  { path: '/base/paginations', name: 'Paginations' },
  { path: '/base/placeholders', name: 'Placeholders' },
  { path: '/base/popovers', name: 'Popovers' },
  { path: '/base/progress', name: 'Progress' },
  { path: '/base/spinners', name: 'Spinners' },
  { path: '/base/tables', name: 'Tables' },
  { path: '/base/tooltips', name: 'Tooltips' },
  { path: '/buttons', name: 'Buttons', exact: true },
  { path: '/buttons/buttons', name: 'Buttons' },
  { path: '/buttons/dropdowns', name: 'Dropdowns' },
  { path: '/buttons/button-groups', name: 'Button Groups' },
  { path: '/charts', name: 'Charts' },
  { path: '/forms', name: 'Forms', exact: true },
  { path: '/forms/form-control', name: 'Form Control' },
  { path: '/forms/select', name: 'Select' },
  { path: '/forms/checks-radios', name: 'Checks & Radios' },
  { path: '/forms/range', name: 'Range' },
  { path: '/forms/input-group', name: 'Input Group' },
  { path: '/forms/floating-labels', name: 'Floating Labels' },
  { path: '/forms/layout', name: 'Layout' },
  { path: '/forms/validation', name: 'Validation' },
  { path: '/icons', exact: true, name: 'Icons' },
  { path: '/icons/coreui-icons', name: 'CoreUI Icons' },
  { path: '/icons/flags', name: 'Flags' },
  { path: '/icons/brands', name: 'Brands' },
  { path: '/notifications', name: 'Notifications', exact: true },
  { path: '/notifications/alerts', name: 'Alerts' },
  { path: '/notifications/badges', name: 'Badges' },
  { path: '/notifications/modals', name: 'Modals' },
  { path: '/notifications/toasts', name: 'Toasts' },
  { path: '/widgets', name: 'Widgets' },

  { path: '/users', name: 'Users' },
  { path: '/users-profile', name: 'Users Profile' },
  { path: '/users-edit/:id', name: 'Users Edit' },

  { path: '/create-front-client', name: 'Front Client' },
  { path: '/edit-front-client/:id', name: 'Edit Front Client' },

  { path: '/create-end-client', name: 'End Client' },
  { path: '/edit-end-client/:id', name: 'Edit End Client' },

  { path: '/create-purchase', name: 'Purchase Order' },
  { path: '/edit-purchase/:id', name: 'Edit Purchase' },
  { path: '/purchase-orders', name: 'Purchase Orders' },

  { path: '/add-assets', name: 'Assets' },
  { path: '/edit-assets/:id', name: 'Edit Assets' },
  { path: '/download-formate', name: 'Download Assets Excel' },
  { path: '/upload-assets', name: 'Upload Assets Excel' },
  { path: '/view-assets', name: 'View Assets' },

  { path: '/incident', name: 'Incidents' },
  { path: '/incident-status/:status', name: 'Incidents By Status' },
  { path: '/edit-incident/:id', name: 'Edit Incident' },
  { path: '/edit-incident/view/:id', name: 'View Incident' },

  { path: '/rma', name: 'RMA' },
  { path: '/rma-status/:status', name: 'RMA By Status' },
  { path: '/rma/view/:id', name: 'View RMA' },

  { path: '/view-challans', name: 'Challan' },
  { path: '/edit-challans/:id', name: 'Edit Challan' },

  { path: '/add-sales-participent', name: 'Create Sales Participent' },
  { path: '/edit-sales-participent/:id', name: 'Edit Sales Participent' },

  { path: '/email-settings', name: 'Email Settings' },
  { path: '/logs', name: 'Logs' },
]

export default routes
