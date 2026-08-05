import DashboardLayout from '@/components/layout/DashboardLayout'
import Buttons from '@/views/buttons/buttons/Buttons'

const ButtonsPage = () => <Buttons />
ButtonsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default ButtonsPage
