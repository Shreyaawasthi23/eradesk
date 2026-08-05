import DashboardLayout from '@/components/layout/DashboardLayout'
import Navs from '@/views/base/navs/Navs'

const NavsPage = () => <Navs />
NavsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default NavsPage
