import DashboardLayout from '@/components/layout/DashboardLayout'
import PurchaseOrders from '@/views/purchase/PurchaseOrders'

const CreatePurchasePage = () => <PurchaseOrders />
CreatePurchasePage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default CreatePurchasePage
