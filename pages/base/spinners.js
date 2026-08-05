import DashboardLayout from '@/components/layout/DashboardLayout'
import Spinners from '@/views/base/spinners/Spinners'

const SpinnersPage = () => <Spinners />
SpinnersPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default SpinnersPage
