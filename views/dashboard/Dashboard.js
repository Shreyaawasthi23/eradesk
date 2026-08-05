import React from 'react'

import { CChart, CChartDoughnut, CChartLine } from '@coreui/react-chartjs'
import { getStyle } from '@coreui/utils'
import CIcon from '@coreui/icons-react'
import { cilCloudDownload, cilTask, cilList, cilSwapVertical, cilLibraryBuilding } from '@coreui/icons'

import { useState } from 'react'
import { useRouter } from 'next/router'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { useEffect } from 'react'
import Swal from 'sweetalert2'
import PieChart from '@/views/charts/PieChart'
import Lottie from 'react-lottie'
import loader from '@/assets/lottie/loading.json'

import styles from './dashboard.module.scss'
import KpiCard from './components/KpiCard'
import YearSelect from './components/YearSelect'
import SingleYearSelect from './components/SingleYearSelect'
import ChartCard from './components/ChartCard'
import UserOverviewTable from './components/UserOverviewTable'
import OverviewMenu from './components/OverviewMenu'

const Dashboard = () => {
  const random = (min, max) => Math.floor(Math.random() * (max - min + 1) + min)
  const router = useRouter()
  const details = getUserDetails()

  useEffect(() => {
    if (!details) {
      Swal.fire({
        title: 'Warning',
        text: 'Your session is expired please login again',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'OK',
      }).then(() => {
        router.push('/')
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const currentYear = new Date().getFullYear()
  const [availableYears, setAvailableYears] = useState([currentYear])
  // Each chart keeps its own independent year selection.
  const [costYear, setCostYear] = useState(currentYear)
  const [costCompareYear, setCostCompareYear] = useState(currentYear - 1)
  const [countYear, setCountYear] = useState(currentYear)
  const [countCompareYear, setCountCompareYear] = useState(currentYear - 1)
  const [salesYear, setSalesYear] = useState(currentYear)
  const [salesCompareYear, setSalesCompareYear] = useState(currentYear - 1)
  const [incidentRmaYear, setIncidentRmaYear] = useState(currentYear)
  const [incidentOverviewYear, setIncidentOverviewYear] = useState(currentYear)
  const [rmaOverviewYear, setRmaOverviewYear] = useState(currentYear)
  const [assetsYear, setAssetsYear] = useState(currentYear)
  const [poCountData, setPoCountData] = useState({})
  const [poCountCompareData, setPoCountCompareData] = useState({})
  const [poValueData, setPoValueData] = useState({})
  const [poValueCompareData, setPoValueCompareData] = useState({})
  const [incidentCountData, setIncidentCountData] = useState({})
  const [rmaCountData, setRmaCountData] = useState({})
  const [incidentOverview, setIncidentOverview] = useState({})
  const [salesReport, setSalesReport] = useState({})
  const [asset, setAssets] = useState({})
  const [poCategoryData, setPoCategoryData] = useState({})

  // Section Loaders
  const [poCostLoader, setPoCostLoader] = useState(false)

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: loader,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice', // Adjusts the aspect ratio to center the animation
    },
  }

  const [userIncidentOverview, setUserIncidentOverview] = useState([])

  const [incidentStatusWiseData, setIncidentStatusWiseData] = useState([])
  const [rmaStatusWiseData, setRmaStatusWiseData] = useState([])

  const getPoReport = async (year, isCompare) => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    const requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    try {
      const response = await fetch(
        apiUrl + '/auth/purchase/po-monthly-count?year=' + year,
        requestOptions,
      )
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          isCompare ? setPoCountCompareData(data) : setPoCountData(data)
        }
      }
    } catch (error) {
      console.log('error', error)
    }
  }
  const getPoValues = async (year, isCompare) => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    const requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    try {
      const response = await fetch(
        apiUrl + '/auth/purchase/po-monthly-value?year=' + year,
        requestOptions,
      )
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          isCompare ? setPoValueCompareData(data) : setPoValueData(data)
        }
      }
    } catch (error) {
      console.log('error', error)
    }
  }
  const getAvailableYears = async () => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    const requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    try {
      const response = await fetch(apiUrl + '/auth/purchase/po-available-years', requestOptions)
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (Array.isArray(data) && data.length) {
          setAvailableYears(data)
        }
      }
    } catch (error) {
      console.log('error', error)
    }
  }
  const getIncidentReport = async (year) => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    try {
      const response = await fetch(
        apiUrl + '/auth/incident/incident-monthly-chart?year=' + year,
        requestOptions,
      )
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setIncidentCountData(data)
        }
      }
    } catch (error) {
      console.log('error', error)
    }
  }
  const getRmaReports = async (year) => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    const requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    try {
      const response = await fetch(apiUrl + '/auth/rma/rma-monthly-chart?year=' + year, requestOptions)
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setRmaCountData(data)
        }
      }
    } catch (error) {
      console.log('error', error)
    }
  }
  const getIncidentOverview = async () => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    const requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    try {
      const response = await fetch(
        apiUrl + '/auth/incident/incident-overview-chart',
        requestOptions,
      )
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setIncidentOverview(data)
        }
      }
    } catch (error) {
      console.log('error', error)
    }
  }
  const getUserIncidentOverview = async () => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    const requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    try {
      const response = await fetch(
        apiUrl + '/auth/incident/support-incident-overview-chart',
        requestOptions,
      )
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setUserIncidentOverview(data)
        }
      }
    } catch (error) {
      console.log('error', error)
    }
  }
  const getIncidentStatus = async (year) => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    const requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    try {
      const response = await fetch(
        apiUrl + '/auth/incident/incident-status-count?year=' + year,
        requestOptions,
      )
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setIncidentStatusWiseData(data)
        }
      }
    } catch (error) {
      console.log('error', error)
    }
  }
  const getRmaStatus = async (year) => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    const requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    try {
      const response = await fetch(
        apiUrl + '/auth/rma/rma-status-count?year=' + year,
        requestOptions,
      )
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setRmaStatusWiseData(data)
        }
      }
    } catch (error) {
      console.log('error', error)
    }
  }
  const getSalesPoWise = async (year, compareYear) => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    const requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    try {
      const response = await fetch(
        apiUrl + '/auth/purchase/po-sales-report?year=' + year + '&compareYear=' + compareYear,
        requestOptions,
      )
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setSalesReport(data)
        }
      }
    } catch (error) {
      console.log('error', error)
    }
  }
  const getAssetCategory = async (year) => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    const requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    try {
      const response = await fetch(
        apiUrl + '/auth/assets/asset-type-count?year=' + year,
        requestOptions,
      )
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          setAssets(data)
        }
      }
    } catch (error) {
      console.log('error', error)
    }
  }
  const getPOCategory = async () => {
    var myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    const requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    }

    try {
      const response = await fetch(apiUrl + '/auth/purchase/po-type-count', requestOptions)
      if (response.status === 401) {
        router.push('/')
      } else {
        const data = await response.json()
        if (data !== null) {
          console.log(data)
          setPoCategoryData(data)
        }
      }
    } catch (error) {
      console.log('error', error)
    }
  }
  const generateRandomColor = () => {
    const r = Math.floor(Math.random() * 256)
    const g = Math.floor(Math.random() * 256)
    const b = Math.floor(Math.random() * 256)
    return `rgba(${r}, ${g}, ${b}, 0.6)`
  }

  useEffect(() => {
    if (details?.roles?.includes('ROLE_ADMIN')) {
      getAvailableYears()
      getPOCategory()
    }

    if (
      details?.roles?.includes('ROLE_ADMIN') ||
      details?.roles?.includes('ROLE_USER') ||
      details?.roles?.includes('ROLE_MODERATOR')
    ) {
      getIncidentOverview()
      getUserIncidentOverview()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (
      (details?.roles?.includes('ROLE_ADMIN') ||
        details?.roles?.includes('ROLE_USER') ||
        details?.roles?.includes('ROLE_MODERATOR')) &&
      incidentRmaYear != null
    ) {
      getIncidentReport(incidentRmaYear)
      getRmaReports(incidentRmaYear)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentRmaYear])

  useEffect(() => {
    if (
      (details?.roles?.includes('ROLE_ADMIN') ||
        details?.roles?.includes('ROLE_USER') ||
        details?.roles?.includes('ROLE_MODERATOR')) &&
      incidentOverviewYear != null
    ) {
      getIncidentStatus(incidentOverviewYear)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentOverviewYear])

  useEffect(() => {
    if (
      (details?.roles?.includes('ROLE_ADMIN') ||
        details?.roles?.includes('ROLE_USER') ||
        details?.roles?.includes('ROLE_MODERATOR')) &&
      rmaOverviewYear != null
    ) {
      getRmaStatus(rmaOverviewYear)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rmaOverviewYear])

  useEffect(() => {
    if (details?.roles?.includes('ROLE_ADMIN') && assetsYear != null) {
      getAssetCategory(assetsYear)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetsYear])

  useEffect(() => {
    if (details?.roles?.includes('ROLE_ADMIN') && costYear != null) {
      getPoValues(costYear, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costYear])

  useEffect(() => {
    if (details?.roles?.includes('ROLE_ADMIN') && costCompareYear != null) {
      getPoValues(costCompareYear, true)
    } else {
      setPoValueCompareData({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costCompareYear])

  useEffect(() => {
    if (details?.roles?.includes('ROLE_ADMIN') && countYear != null) {
      getPoReport(countYear, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countYear])

  useEffect(() => {
    if (details?.roles?.includes('ROLE_ADMIN') && countCompareYear != null) {
      getPoReport(countCompareYear, true)
    } else {
      setPoCountCompareData({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countCompareYear])

  useEffect(() => {
    if (details?.roles?.includes('ROLE_ADMIN') && salesYear != null) {
      getSalesPoWise(salesYear, salesCompareYear)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesYear, salesCompareYear])

  const poChartColors = { primary: '#1a73b8', secondary: '#0f2744' }
  const poChartPalette = [
    '#2196F3', '#22C58B', '#17A2A8', '#F4623A', '#C0392B', '#0f2744',
    '#8E44AD', '#F1C40F', '#16A085', '#D35400', '#7F8C8D', '#1a73b8',
    '#27AE60', '#E67E22', '#95A5A6', '#3498DB', '#E74C3C', '#1ABC9C',
    '#9B59B6', '#F39C12',
  ]
  const noGridChartOptions = {
    plugins: { datalabels: { display: false }, legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { display: false } },
    },
  }

  const monthKeys = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
  ]
  const monthLabels = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  const sumMonths = (obj) => monthKeys.reduce((total, key) => total + (Number(obj?.[key]) || 0), 0)
  const pctChange = (current, previous) => {
    if (!previous) return undefined
    return Math.round(((current - previous) / previous) * 100)
  }

  const totalPoCount = sumMonths(poCountData)
  const totalPoCountCompare = sumMonths(poCountCompareData)
  const totalPoValue = sumMonths(poValueData)
  const totalRmaCount = sumMonths(rmaCountData)
  const totalIncidentCount = sumMonths(incidentCountData)

  const isAdmin = details?.roles?.includes('ROLE_ADMIN')
  const canSeeOpsData =
    details?.roles?.includes('ROLE_ADMIN') ||
    details?.roles?.includes('ROLE_USER') ||
    details?.roles?.includes('ROLE_MODERATOR')

  const costYearSelectProps = {
    availableYears,
    poYear: costYear,
    setPoYear: setCostYear,
    poCompareYear: costCompareYear,
    setPoCompareYear: setCostCompareYear,
  }
  const countYearSelectProps = {
    availableYears,
    poYear: countYear,
    setPoYear: setCountYear,
    poCompareYear: countCompareYear,
    setPoCompareYear: setCountCompareYear,
  }
  const salesYearSelectProps = {
    availableYears,
    poYear: salesYear,
    setPoYear: setSalesYear,
    poCompareYear: salesCompareYear,
    setPoCompareYear: setSalesCompareYear,
  }
  const downloadButton = (
    <button className={styles.yearSelect} aria-label="Download">
      <CIcon icon={cilCloudDownload} />
    </button>
  )

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Dashboard</h1>
      <p className={styles.pageSubtitle}>Operational overview for {tenant}</p>

      {isAdmin && (
        <div className={styles.kpiGrid}>
          <KpiCard
            label={`Purchase Orders (${countYear})`}
            value={totalPoCount.toLocaleString()}
            trend={pctChange(totalPoCount, totalPoCountCompare)}
            icon={cilList}
          />
          <KpiCard
            label={`PO Value (${costYear})`}
            value={'₹' + totalPoValue.toLocaleString()}
            icon={cilLibraryBuilding}
          />
          <KpiCard
            label="Total Incidents"
            value={(incidentOverview.totalIncidents ?? totalIncidentCount).toLocaleString()}
            icon={cilTask}
          />
          <KpiCard
            label="RMA (This Year)"
            value={totalRmaCount.toLocaleString()}
            icon={cilSwapVertical}
          />
        </div>
      )}

      {isAdmin && (
        <>
          <div className={styles.chartGrid2}>
            <ChartCard
              title="Purchase Order (Cost)"
              subtitle="January - December"
              controls={
                <>
                  <YearSelect {...costYearSelectProps} />
                  {downloadButton}
                </>
              }
            >
              {poCostLoader ? (
                <Lottie options={defaultOptions} height={100} width={100} />
              ) : (
                <CChart
                  type="bar"
                  data={{
                    labels: monthLabels,
                    datasets: [
                      {
                        label: 'Year ' + costYear,
                        backgroundColor: poChartColors.primary,
                        data: monthKeys.map((m) => poValueData[m]),
                      },
                      {
                        label: 'Year ' + costCompareYear,
                        backgroundColor: poChartColors.secondary,
                        data: monthKeys.map((m) => poValueCompareData[m]),
                      },
                    ],
                  }}
                  options={noGridChartOptions}
                />
              )}
            </ChartCard>

            <ChartCard
              title="Purchase Order (Count)"
              subtitle="January - December"
              controls={
                <>
                  <YearSelect {...countYearSelectProps} />
                  {downloadButton}
                </>
              }
            >
              <CChart
                type="bar"
                data={{
                  labels: monthLabels,
                  datasets: [
                    {
                      label: 'Year ' + countYear,
                      backgroundColor: poChartColors.primary,
                      data: monthKeys.map((m) => poCountData[m]),
                    },
                    {
                      label: 'Year ' + countCompareYear,
                      backgroundColor: poChartColors.secondary,
                      data: monthKeys.map((m) => poCountCompareData[m]),
                    },
                  ],
                }}
                options={noGridChartOptions}
              />
            </ChartCard>
          </div>

          <div className={styles.chartGridFull}>
            <ChartCard
              title="Salesman Reports"
              subtitle="By purchase order value"
              controls={
                <>
                  <YearSelect {...salesYearSelectProps} />
                  {downloadButton}
                </>
              }
            >
              <CChart
                height={'100%'}
                type="bar"
                data={{
                  labels:
                    salesReport && Array.isArray(salesReport)
                      ? [...salesReport]
                          .sort(
                            (a, b) =>
                              b.currentYearCost + b.lastYearCost -
                              (a.currentYearCost + a.lastYearCost),
                          )
                          .map((item) => item.name)
                      : [],
                  datasets: [
                    {
                      label: 'Year ' + salesYear,
                      backgroundColor: poChartColors.primary,
                      borderRadius: 6,
                      borderSkipped: false,
                      data:
                        salesReport && Array.isArray(salesReport)
                          ? [...salesReport]
                              .sort(
                                (a, b) =>
                                  b.currentYearCost + b.lastYearCost -
                                  (a.currentYearCost + a.lastYearCost),
                              )
                              .map((item) => item.currentYearCost)
                          : [],
                    },
                    {
                      label: 'Year ' + salesCompareYear,
                      backgroundColor: poChartColors.secondary,
                      borderRadius: 6,
                      borderSkipped: false,
                      data:
                        salesReport && Array.isArray(salesReport)
                          ? [...salesReport]
                              .sort(
                                (a, b) =>
                                  b.currentYearCost + b.lastYearCost -
                                  (a.currentYearCost + a.lastYearCost),
                              )
                              .map((item) => item.lastYearCost)
                          : [],
                    },
                  ],
                }}
                options={{
                  ...noGridChartOptions,
                }}
              />
            </ChartCard>
          </div>

          <div className={styles.chartGrid2}>
            <ChartCard
              title="Assets Chart"
              subtitle="Top 10 asset types by count"
              controls={
                <SingleYearSelect
                  availableYears={availableYears}
                  year={assetsYear}
                  setYear={setAssetsYear}
                />
              }
            >
              {(() => {
                const sortedAssets =
                  asset && Array.isArray(asset)
                    ? [...asset].sort((a, b) => b.count - a.count)
                    : []
                const topAssets = sortedAssets.slice(0, 10)
                const topTotal = topAssets.reduce((sum, item) => sum + (item.count || 0), 0)
                return (
                  <div style={{ position: 'relative', height: 260 }}>
                    <CChartDoughnut
                      height={260}
                      options={{
                        maintainAspectRatio: false,
                        cutout: '70%',
                        plugins: { datalabels: { display: false }, legend: { position: 'bottom' } },
                      }}
                      data={{
                        labels: topAssets.map((item) => item.assetType),
                        datasets: [
                          {
                            backgroundColor: topAssets.map(
                              (_, i) => poChartPalette[i % poChartPalette.length],
                            ),
                            data: topAssets.map((item) => item.count),
                            borderWidth: 2,
                            borderColor: '#ffffff',
                          },
                        ],
                      }}
                    />
                    <div className={styles.donutCenterLabel}>
                      <div className={styles.donutCenterValue}>{topTotal}</div>
                      <div className={styles.donutCenterCaption}>Total Assets</div>
                    </div>
                  </div>
                )
              })()}
            </ChartCard>

            <ChartCard title="Purchase Order Chart">
              {Array.isArray(poCategoryData) && poCategoryData.length > 0 ? (
              <CChart
                type="line"
                height={260}
                customTooltips={false}
                data={{
                  labels: poCategoryData.map((item) => item.assetType),
                  datasets: [
                    {
                      label: 'Count',
                      borderColor: poChartColors.primary,
                      backgroundColor: 'transparent',
                      pointBackgroundColor: poChartColors.primary,
                      pointBorderColor: '#ffffff',
                      pointBorderWidth: 2,
                      pointRadius: 5,
                      pointHoverRadius: 6,
                      borderWidth: 3,
                      tension: 0.4,
                      fill: false,
                      data: poCategoryData.map((item) => item.count),
                    },
                  ],
                }}
                options={{
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true },
                  },
                  scales: {
                    x: { grid: { color: getStyle('--cui-border-color-translucent') } },
                    y: { grid: { color: getStyle('--cui-border-color-translucent') } },
                  },
                }}
              />
              ) : (
                <div className="text-medium-emphasis text-center py-5">No purchase order data</div>
              )}
            </ChartCard>
          </div>
        </>
      )}

      {canSeeOpsData && (
        <div className={styles.chartGridFull}>
          <ChartCard
            title="Incident & RMA"
            subtitle={`January - December ${incidentRmaYear}`}
            controls={
              <>
                <SingleYearSelect
                  availableYears={availableYears}
                  year={incidentRmaYear}
                  setYear={setIncidentRmaYear}
                />
                {downloadButton}
              </>
            }
          >
            <CChartLine
              style={{ height: '240px' }}
              data={{
                labels: monthLabels,
                datasets: [
                  {
                    label: 'Incidents',
                    backgroundColor: 'transparent',
                    borderColor: '#FF6A00',
                    pointBackgroundColor: '#FF6A00',
                    pointBorderColor: '#FFD24C',
                    pointBorderWidth: 2,
                    pointHoverBackgroundColor: '#FF6A00',
                    borderWidth: 3,
                    data: monthKeys.map((m) => incidentCountData[m]),
                    fill: false,
                  },
                  {
                    label: 'RMA',
                    backgroundColor: 'transparent',
                    borderColor: '#E6197A',
                    pointBackgroundColor: '#E6197A',
                    pointBorderColor: '#FFD24C',
                    pointBorderWidth: 2,
                    pointHoverBackgroundColor: '#E6197A',
                    borderWidth: 3,
                    data: monthKeys.map((m) => rmaCountData[m]),
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    labels: {
                      color: getStyle('--cui-body-color'),
                      usePointStyle: true,
                      pointStyle: 'circle',
                    },
                  },
                },
                scales: {
                  x: { grid: { color: getStyle('--cui-border-color-translucent'), tickColor: getStyle('--cui-border-color-translucent') } },
                  y: {
                    grid: { color: getStyle('--cui-border-color-translucent') },
                    ticks: {
                      beginAtZero: true,
                      maxTicksLimit: 8,
                      stepSize: Math.ceil(250 / 8),
                      max: 250,
                    },
                  },
                },
                elements: {
                  line: { tension: 0 },
                  point: { radius: 5, hitRadius: 10, hoverRadius: 7, hoverBorderWidth: 3 },
                },
              }}
            />
            <div className={styles.kpiGrid} style={{ marginTop: 14, marginBottom: 0 }}>
              <KpiCard
                label="Total Incidents"
                value={`${incidentOverview.totalIncidents ?? 0} (100%)`}
              />
              <KpiCard
                label="Today Incidents"
                value={`${incidentOverview.todayIncident ?? 0} (${incidentOverview.todayPercentage ?? 0}%)`}
              />
              <KpiCard
                label="Open Incidents"
                value={`${incidentOverview.openIncidents ?? 0} (${incidentOverview.openPercentage ?? 0}%)`}
              />
              <KpiCard
                label="Pending for Spare"
                value={`${incidentOverview.pendingForSpare ?? 0} (${incidentOverview.pendingPercentage ?? 0}%)`}
              />
            </div>
          </ChartCard>
        </div>
      )}

      {canSeeOpsData && (
        <div className={styles.chartGrid2}>
          <ChartCard
            title="Incident Overview"
            controls={
              <>
                <SingleYearSelect
                  availableYears={availableYears}
                  year={incidentOverviewYear}
                  setYear={setIncidentOverviewYear}
                />
                <OverviewMenu items={incidentStatusWiseData} hrefBase="/incident-status/" />
              </>
            }
          >
            <div className="d-flex justify-content-center">
              <PieChart data={incidentStatusWiseData} />
            </div>
          </ChartCard>

          <ChartCard
            title="RMA Overview"
            controls={
              <>
                <SingleYearSelect
                  availableYears={availableYears}
                  year={rmaOverviewYear}
                  setYear={setRmaOverviewYear}
                />
                <OverviewMenu items={rmaStatusWiseData} hrefBase="/rma-status/" />
              </>
            }
          >
            <div className="d-flex justify-content-center">
              <PieChart data={rmaStatusWiseData} />
            </div>
          </ChartCard>
        </div>
      )}

      {canSeeOpsData && (
        <div className={styles.chartGridFull}>
          <ChartCard title="User Dashboard">
            <UserOverviewTable data={userIncidentOverview} />
          </ChartCard>
        </div>
      )}
    </div>
  )
}

export default Dashboard
