import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Swal from 'sweetalert2'
import * as XLSX from 'xlsx'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { runReport, saveReport, deleteReport } from '@/api/reports_api'
import styles from '../itil/itil.module.scss'

const OPERATORS = ['EQUALS', 'NOT_EQUALS', 'CONTAINS', 'GREATER_THAN', 'LESS_THAN']

const ReportBuilder = () => {
  const router = useRouter()
  const details = getUserDetails()
  const [dataSources, setDataSources] = useState([])
  const [dataSource, setDataSource] = useState('')
  const [selectedFields, setSelectedFields] = useState([])
  const [filters, setFilters] = useState([])
  const [groupBy, setGroupBy] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [sortDirection, setSortDirection] = useState('ASC')
  const [result, setResult] = useState(null)
  const [savedReports, setSavedReports] = useState([])

  const authFetch = (path) => {
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    return fetch(apiUrl + path, { method: 'GET', headers: myHeaders, redirect: 'follow' })
  }

  const getDataSources = async () => {
    const r = await authFetch('/auth/reports/data-sources')
    if (r.status === 401) return router.push('/')
    const data = await r.json()
    setDataSources(data)
    if (data.length) setDataSource(data[0].name)
  }

  const getSavedReports = async () => {
    const r = await authFetch('/auth/reports/get-all-page?page=0&size=50')
    if (r.status === 401) return router.push('/')
    const data = await r.json()
    setSavedReports(data.content || [])
  }

  const currentFields = dataSources.find((d) => d.name === dataSource)?.fields || []

  const addFilter = () => setFilters((fs) => [...fs, { field: currentFields[0] || '', operator: 'EQUALS', value: '' }])
  const updateFilter = (idx, key, value) => setFilters((fs) => fs.map((f, i) => (i === idx ? { ...f, [key]: value } : f)))
  const removeFilter = (idx) => setFilters((fs) => fs.filter((_, i) => i !== idx))

  const buildSpec = () => ({
    dataSource,
    fields: selectedFields,
    filters,
    groupBy: groupBy || null,
    sortBy: sortBy || null,
    sortDirection,
  })

  const runQuery = () => {
    runReport(buildSpec(), router, setResult)
  }

  const handleSave = () => {
    Swal.fire({ title: 'Report name', input: 'text', showCancelButton: true, confirmButtonText: 'Save' }).then((r) => {
      if (r.isConfirmed && r.value) {
        saveReport({ ...buildSpec(), name: r.value }, router, () => {
          getSavedReports()
          Swal.fire('Saved', '', 'success')
        })
      }
    })
  }

  const runSaved = async (report) => {
    const r = await authFetch('/auth/reports/run-saved?id=' + report.id)
    if (r.status === 401) return router.push('/')
    setResult(await r.json())
  }

  const removeSaved = (id) => deleteReport(id, router, getSavedReports)

  const exportExcel = () => {
    if (!result?.rows?.length) {
      Swal.fire('No data', 'Run a report first.', 'info')
      return
    }
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(result.rows)
    XLSX.utils.book_append_sheet(wb, ws, 'Report')
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'report.xlsx'
    link.click()
  }

  useEffect(() => {
    getDataSources()
    getSavedReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Report Builder</h1>
          <p className={styles.pageSubtitle}>Build, save, and export ad-hoc reports</p>
        </div>
      </div>

      <div className={styles.detailLayout}>
        <div>
          <div className={styles.card} style={{ padding: 20, marginBottom: 16 }}>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Data Source</label>
                <select
                  className={styles.formInput}
                  value={dataSource}
                  onChange={(e) => {
                    setDataSource(e.target.value)
                    setSelectedFields([])
                    setFilters([])
                    setGroupBy('')
                    setSortBy('')
                  }}
                >
                  {dataSources.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Group By</label>
                <select className={styles.formInput} value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                  <option value="">None</option>
                  {currentFields.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Sort By</label>
                <select className={styles.formInput} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="">None</option>
                  {currentFields.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Direction</label>
                <select className={styles.formInput} value={sortDirection} onChange={(e) => setSortDirection(e.target.value)}>
                  <option value="ASC">Ascending</option>
                  <option value="DESC">Descending</option>
                </select>
              </div>
              <div className={`${styles.formField} ${styles.full}`}>
                <label className={styles.formLabel}>Fields to show (empty = all)</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {currentFields.map((f) => (
                    <label key={f} style={{ fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(f)}
                        onChange={(e) =>
                          setSelectedFields((sf) => (e.target.checked ? [...sf, f] : sf.filter((x) => x !== f)))
                        }
                      />{' '}
                      {f}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <p className={styles.detailSectionLabel}>Filters</p>
              {filters.map((f, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <select className={styles.formInput} value={f.field} onChange={(e) => updateFilter(idx, 'field', e.target.value)}>
                    {currentFields.map((cf) => (
                      <option key={cf} value={cf}>
                        {cf}
                      </option>
                    ))}
                  </select>
                  <select className={styles.formInput} value={f.operator} onChange={(e) => updateFilter(idx, 'operator', e.target.value)}>
                    {OPERATORS.map((op) => (
                      <option key={op} value={op}>
                        {op.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={f.value}
                    onChange={(e) => updateFilter(idx, 'value', e.target.value)}
                  />
                  <button type="button" className={styles.editBtn} onClick={() => removeFilter(idx)}>
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className={styles.editBtn} onClick={addFilter}>
                + Filter
              </button>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button type="button" className={styles.addBtn} onClick={runQuery}>
                Run Report
              </button>
              <button type="button" className={styles.filterClear} onClick={handleSave}>
                Save
              </button>
              <button type="button" className={styles.filterClear} onClick={exportExcel}>
                Export Excel
              </button>
            </div>
          </div>

          {result && (
            <div className={styles.card} style={{ padding: 20 }}>
              <p className={styles.detailSectionLabel}>
                Results ({result.rowCount} row{result.rowCount === 1 ? '' : 's'})
              </p>
              {result.grouped ? (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Group</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.grouped.map((g) => (
                      <tr key={String(g.key)}>
                        <td>{String(g.key)}</td>
                        <td>{g.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        {result.rows[0] &&
                          Object.keys(result.rows[0]).map((k) => <th key={k}>{k}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, idx) => (
                        <tr key={idx}>
                          {Object.values(row).map((v, i) => (
                            <td key={i} className={styles.email}>
                              {typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <div className={styles.sidePanel}>
            <p className={styles.sidePanelTitle}>Saved Reports</p>
            <div className={styles.chipList}>
              {savedReports.map((r) => (
                <div key={r.id} className={styles.chip} onClick={() => runSaved(r)}>
                  <span className={styles.chipTitle}>{r.name}</span>
                  <button
                    type="button"
                    className={styles.editBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      removeSaved(r.id)
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
              {savedReports.length === 0 && <span className={styles.email}>No saved reports yet</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportBuilder
