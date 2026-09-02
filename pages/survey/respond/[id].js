import dynamic from 'next/dynamic'

const SurveyRespond = dynamic(() => import('@/views/survey/SurveyRespond'), { ssr: false })

const SurveyRespondPage = () => <SurveyRespond />

export default SurveyRespondPage
