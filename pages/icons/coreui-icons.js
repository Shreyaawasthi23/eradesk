import DashboardLayout from '@/components/layout/DashboardLayout'
import CoreUIIcons from '@/views/icons/coreui-icons/CoreUIIcons'

const CoreUIIconsPage = () => <CoreUIIcons />
CoreUIIconsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default CoreUIIconsPage
