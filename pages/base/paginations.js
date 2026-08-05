import DashboardLayout from '@/components/layout/DashboardLayout'
import Paginations from '@/views/base/paginations/Paginations'

const PaginationsPage = () => <Paginations />
PaginationsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default PaginationsPage
