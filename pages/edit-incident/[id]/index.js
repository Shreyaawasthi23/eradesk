import { useEffect } from 'react'
import { useRouter } from 'next/router'
import DashboardLayout from '@/components/layout/DashboardLayout'

// Editing incidents now happens in a modal on the listing pages.
const EditIncidentPage = () => {
  const router = useRouter()
  useEffect(() => {
    router.replace('/incident')
  }, [router])
  return null
}
EditIncidentPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default EditIncidentPage
