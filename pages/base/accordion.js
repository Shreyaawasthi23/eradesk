import DashboardLayout from '@/components/layout/DashboardLayout'
import Accordion from '@/views/base/accordion/Accordion'

const AccordionPage = () => <Accordion />
AccordionPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default AccordionPage
