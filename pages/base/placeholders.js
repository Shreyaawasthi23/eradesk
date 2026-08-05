import DashboardLayout from '@/components/layout/DashboardLayout'
import Placeholders from '@/views/base/placeholders/Placeholders'

const PlaceholdersPage = () => <Placeholders />
PlaceholdersPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default PlaceholdersPage
