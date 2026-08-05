import DashboardLayout from '@/components/layout/DashboardLayout'
import Validation from '@/views/forms/validation/Validation'

const ValidationPage = () => <Validation />
ValidationPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default ValidationPage
