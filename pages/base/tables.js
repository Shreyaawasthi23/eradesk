import DashboardLayout from '@/components/layout/DashboardLayout'
import Tables from '@/views/base/tables/Tables'

const TablesPage = () => <Tables />
TablesPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default TablesPage
