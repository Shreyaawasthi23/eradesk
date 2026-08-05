import DashboardLayout from '@/components/layout/DashboardLayout'
import Carousels from '@/views/base/carousels/Carousels'

const CarouselsPage = () => <Carousels />
CarouselsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default CarouselsPage
