import DashboardLayout from '@/components/layout/DashboardLayout'
import View_RMA from '@/views/rma/View_RMA'

const ViewRmaPage = () => <View_RMA />
ViewRmaPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default ViewRmaPage
