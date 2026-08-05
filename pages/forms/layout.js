import DashboardLayout from '@/components/layout/DashboardLayout'
import Layout from '@/views/forms/layout/Layout'

const LayoutPage = () => <Layout />
LayoutPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default LayoutPage
