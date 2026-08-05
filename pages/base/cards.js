import DashboardLayout from '@/components/layout/DashboardLayout'
import Cards from '@/views/base/cards/Cards'

const CardsPage = () => <Cards />
CardsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default CardsPage
