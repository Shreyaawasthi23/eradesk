import DashboardLayout from '@/components/layout/DashboardLayout'
import Range from '@/views/forms/range/Range'

const RangePage = () => <Range />
RangePage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default RangePage
