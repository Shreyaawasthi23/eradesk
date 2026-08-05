import DashboardLayout from '@/components/layout/DashboardLayout'
import Widgets from '@/views/widgets/Widgets'

const WidgetsPage = () => <Widgets />
WidgetsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default WidgetsPage
