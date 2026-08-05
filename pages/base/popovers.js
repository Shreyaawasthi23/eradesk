import DashboardLayout from '@/components/layout/DashboardLayout'
import Popovers from '@/views/base/popovers/Popovers'

const PopoversPage = () => <Popovers />
PopoversPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default PopoversPage
