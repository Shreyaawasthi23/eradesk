import dynamic from 'next/dynamic'
import DashboardLayout from '@/components/layout/DashboardLayout'

const ServiceCatalog = dynamic(() => import('@/views/catalog/ServiceCatalog'), { ssr: false })

const CatalogPage = () => <ServiceCatalog />
CatalogPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>

export default CatalogPage
