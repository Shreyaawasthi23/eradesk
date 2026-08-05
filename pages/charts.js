import DashboardLayout from '@/components/layout/DashboardLayout'
import Charts from '@/views/charts/Charts'

const ChartsPage = () => <Charts />
ChartsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default ChartsPage
