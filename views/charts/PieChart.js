/* eslint-disable react/prop-types */
import React from 'react'
import { CChart } from '@coreui/react-chartjs'
import styles from '@/views/dashboard/dashboard.module.scss'

const gaugePalette = [
  '#2E86DE', '#22C58B', '#F4623A', '#8E44AD', '#F1C40F',
  '#17A2A8', '#D35400', '#2980B9', '#E74C3C', '#16A085',
]

const PieChart = ({ data }) => {
  const items = Array.isArray(data) ? data : []
  const total = items.reduce((sum, item) => sum + (item?.count || 0), 0)
  const colors = items.map((_, i) => gaugePalette[i % gaugePalette.length])

  const chartData = {
    labels: items.map((item) => item?.status),
    datasets: [
      {
        data: items.map((item) => item?.count),
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    circumference: 180,
    rotation: 270,
    cutout: '70%',
    plugins: {
      legend: { display: false },
    },
  }

  return (
    <div className={styles.gaugeWrap}>
      <div style={{ position: 'relative', width: '320px', height: '190px' }}>
        <CChart
          type="doughnut"
          data={chartData}
          options={chartOptions}
          customTooltips={false}
          style={{ width: '320px', height: '190px' }}
        />
        <div className={styles.gaugeCenterLabel}>
          <div className={styles.gaugeCenterValue}>{total}</div>
          <div className={styles.gaugeCenterCaption}>Total</div>
        </div>
      </div>
      <div className={styles.gaugeLegend}>
        {items.map((item, i) => (
          <span key={item?.status ?? i} className={styles.gaugeLegendItem}>
            <span className={styles.gaugeLegendSwatch} style={{ background: colors[i] }} />
            {item?.status} ({item?.count})
          </span>
        ))}
      </div>
    </div>
  )
}

export default PieChart
