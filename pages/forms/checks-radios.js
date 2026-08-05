import DashboardLayout from '@/components/layout/DashboardLayout'
import ChecksRadios from '@/views/forms/checks-radios/ChecksRadios'

const ChecksRadiosPage = () => <ChecksRadios />
ChecksRadiosPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default ChecksRadiosPage
