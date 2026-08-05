import DashboardLayout from '@/components/layout/DashboardLayout'
import Alerts from '@/views/notifications/alerts/Alerts'

const AlertsPage = () => <Alerts />
AlertsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default AlertsPage
