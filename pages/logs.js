import DashboardLayout from '@/components/layout/DashboardLayout'
import Logs from '@/views/logs/Logs'

const LogsPage = () => <Logs />
LogsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default LogsPage
