import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const Knowledge = dynamic(() => import('@/views/knowledge/Knowledge'), { ssr: false })

const KnowledgePage = () => <Knowledge />
KnowledgePage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default KnowledgePage
