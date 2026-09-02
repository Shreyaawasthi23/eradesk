import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const ContractDetail = dynamic(() => import('@/views/contract/ContractDetail'), { ssr: false })

const ContractDetailPage = () => <ContractDetail />
ContractDetailPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default ContractDetailPage
