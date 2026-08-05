import DashboardLayout from '@/components/layout/DashboardLayout'
import Progress from '@/views/base/progress/Progress'

const ProgressPage = () => <Progress />
ProgressPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default ProgressPage
