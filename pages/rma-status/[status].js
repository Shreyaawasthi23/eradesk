import DashboardLayout from '@/components/layout/DashboardLayout'
import RMA_Status from '@/views/rma/RMA_Status'

const RmaStatusPage = () => <RMA_Status />
RmaStatusPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default RmaStatusPage
