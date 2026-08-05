import styles from '../dashboard.module.scss'
import Sparkline from './Sparkline'

const initials = (name) => (name ? name.charAt(0).toUpperCase() : '?')

const avatarPalette = [
  '#2E86DE', '#22C58B', '#8E44AD', '#F4623A', '#17A2A8', '#D35400',
]

const UserOverviewTable = ({ data }) => {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.userTable}>
        <thead>
          <tr>
            <th>User</th>
            <th>Created</th>
            <th>Incident Today</th>
            <th>Total Incidents</th>
            <th>Closed Incidents</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((item, index) => (
            <tr key={index}>
              <td>
                <div className={styles.userCell}>
                  <div
                    className={styles.userAvatar}
                    style={{ background: avatarPalette[index % avatarPalette.length] }}
                  >
                    {initials(item.userName)}
                  </div>
                  <div className={styles.userName}>{item.userName}</div>
                </div>
              </td>
              <td>
                <span className={styles.userMeta}>{item.userCreateDate}</span>
              </td>
              <td className={styles.tableFigure}>
                <span className={styles.todayBadge}>{item.ticketsToday}</span>
              </td>
              <td>
                <div className={styles.trendCell}>
                  <Sparkline values={item.totalTrend} color="var(--dash-success)" />
                  <div className={styles.trendStats}>
                    <strong className={styles.tableFigure}>{item.totalTicketsPercentage}%</strong>
                    <span className={styles.userMeta}>Count - {item.totalTickets}</span>
                  </div>
                </div>
              </td>
              <td>
                <div className={styles.trendCell}>
                  <Sparkline values={item.closedTrend} color="var(--dash-danger)" />
                  <div className={styles.trendStats}>
                    <strong className={styles.tableFigure}>{item.totalClosedPercentage}%</strong>
                    <span className={styles.userMeta}>Count - {item.totalClosedTickets}</span>
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default UserOverviewTable
