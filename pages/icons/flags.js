import DashboardLayout from '@/components/layout/DashboardLayout'
import Flags from '@/views/icons/flags/Flags'

const FlagsPage = () => <Flags />
FlagsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default FlagsPage
