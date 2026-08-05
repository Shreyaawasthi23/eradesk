import DashboardLayout from '@/components/layout/DashboardLayout'
import Colors from '@/views/theme/colors/Colors'

const ColorsPage = () => <Colors />
ColorsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default ColorsPage
