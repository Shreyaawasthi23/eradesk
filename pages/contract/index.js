import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const Contract = dynamic(() => import('@/views/contract/Contract'), { ssr: false })

const ContractPage = () => <Contract />
ContractPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default ContractPage
