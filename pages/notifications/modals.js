import DashboardLayout from '@/components/layout/DashboardLayout'
import Modals from '@/views/notifications/modals/Modals'

const ModalsPage = () => <Modals />
ModalsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default ModalsPage
