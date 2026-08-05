import DashboardLayout from '@/components/layout/DashboardLayout'
import Dropdowns from '@/views/buttons/dropdowns/Dropdowns'

const DropdownsPage = () => <Dropdowns />
DropdownsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default DropdownsPage
