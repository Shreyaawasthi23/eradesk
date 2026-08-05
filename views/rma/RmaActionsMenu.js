import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowUpRightFromSquare, faUpload } from '@fortawesome/free-solid-svg-icons'
import styles from './rma.module.scss'

// Row of colored icon buttons for per-RMA quick actions, matching the
// challan page's action-icon style.
const RmaActionsMenu = ({ canUploadPod, onView, onUploadPod }) => {
  return (
    <div className={styles.iconActionGroup}>
      <button type="button" className={styles.iconActionView} title="View / Edit" onClick={onView}>
        <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
      </button>
      {canUploadPod && (
        <button
          type="button"
          className={styles.iconActionUpload}
          title="Upload POD"
          onClick={onUploadPod}
        >
          <FontAwesomeIcon icon={faUpload} />
        </button>
      )}
    </div>
  )
}

export default RmaActionsMenu
