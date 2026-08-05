import DashboardLayout from '@/components/layout/DashboardLayout'
import Breadcrumbs from '@/views/base/breadcrumbs/Breadcrumbs'

const BreadcrumbsPage = () => <Breadcrumbs />
BreadcrumbsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default BreadcrumbsPage
