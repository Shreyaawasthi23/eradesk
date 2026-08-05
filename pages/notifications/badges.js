import DashboardLayout from '@/components/layout/DashboardLayout'
import Badges from '@/views/notifications/badges/Badges'

const BadgesPage = () => <Badges />
BadgesPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default BadgesPage
