const Sparkline = ({ values, color = 'var(--dash-accent)', width = 84, height = 28 }) => {
  const data = Array.isArray(values) && values.length > 0 ? values : [0]
  const max = Math.max(...data, 1)
  const step = data.length > 1 ? width / (data.length - 1) : 0
  const points = data.map((v, i) => {
    const x = data.length > 1 ? i * step : width / 2
    const y = height - (v / max) * (height - 4) - 2
    return `${x},${y}`
  })
  const linePath = `M${points.join(' L')}`
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={areaPath} fill={color} opacity="0.12" stroke="none" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export default Sparkline
