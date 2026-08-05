import DashboardLayout from '@/components/layout/DashboardLayout'
import Collapses from '@/views/base/collapses/Collapses'

const CollapsesPage = () => <Collapses />
CollapsesPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default CollapsesPage
