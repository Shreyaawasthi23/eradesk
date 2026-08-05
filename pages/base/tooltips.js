import DashboardLayout from '@/components/layout/DashboardLayout'
import Tooltips from '@/views/base/tooltips/Tooltips'

const TooltipsPage = () => <Tooltips />
TooltipsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default TooltipsPage
