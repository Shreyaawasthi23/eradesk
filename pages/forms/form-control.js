import DashboardLayout from '@/components/layout/DashboardLayout'
import FormControl from '@/views/forms/form-control/FormControl'

const FormControlPage = () => <FormControl />
FormControlPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default FormControlPage
