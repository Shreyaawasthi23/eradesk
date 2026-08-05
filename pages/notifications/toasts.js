import DashboardLayout from '@/components/layout/DashboardLayout'
import Toasts from '@/views/notifications/toasts/Toasts'

const ToastsPage = () => <Toasts />
ToastsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default ToastsPage
