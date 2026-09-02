import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const Vendor = dynamic(() => import('@/views/vendor/Vendor'), { ssr: false })

const VendorPage = () => <Vendor />
VendorPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default VendorPage
