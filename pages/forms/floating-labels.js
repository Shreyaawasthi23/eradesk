import DashboardLayout from '@/components/layout/DashboardLayout'
import FloatingLabels from '@/views/forms/floating-labels/FloatingLabels'

const FloatingLabelsPage = () => <FloatingLabels />
FloatingLabelsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default FloatingLabelsPage
