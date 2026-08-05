import DashboardLayout from '@/components/layout/DashboardLayout'
import PurchaseOrdersSearch from '@/views/purchase/PurchaseOrdersSearch'

const PurchaseOrdersPage = () => <PurchaseOrdersSearch />
PurchaseOrdersPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default PurchaseOrdersPage
