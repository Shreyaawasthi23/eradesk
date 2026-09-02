import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const Announcement = dynamic(() => import('@/views/announcement/Announcement'), { ssr: false })

const AnnouncementPage = () => <Announcement />
AnnouncementPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default AnnouncementPage
