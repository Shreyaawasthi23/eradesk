import DashboardLayout from '@/components/layout/DashboardLayout'
import InputGroup from '@/views/forms/input-group/InputGroup'

const InputGroupPage = () => <InputGroup />
InputGroupPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default InputGroupPage
