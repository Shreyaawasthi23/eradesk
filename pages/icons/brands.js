import DashboardLayout from '@/components/layout/DashboardLayout'
import Brands from '@/views/icons/brands/Brands'

const BrandsPage = () => <Brands />
BrandsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default BrandsPage
