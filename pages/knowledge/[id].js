import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const KnowledgeDetail = dynamic(() => import('@/views/knowledge/KnowledgeDetail'), { ssr: false })

const KnowledgeDetailPage = () => <KnowledgeDetail />
KnowledgeDetailPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default KnowledgeDetailPage
