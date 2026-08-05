import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faEye,
  faPenToSquare,
  faCommentDots,
  faRotateLeft,
  faLocationDot,
} from '@fortawesome/free-solid-svg-icons'
import styles from './incident.module.scss'

// Row of colored icon buttons for per-incident quick actions, matching the
// challan page's action-icon style.
const IncidentActionsMenu = ({
  canRaiseRma,
  canEdit,
  canRegisterLocation,
  onRaiseRma,
  onAddNote,
  onEdit,
  onView,
  onRegisterLocation,
}) => {
  return (
    <div className={styles.iconActionGroup}>
      <button type="button" className={styles.iconActionView} title="View" onClick={onView}>
        <FontAwesomeIcon icon={faEye} />
      </button>
      {canEdit && (
        <button type="button" className={styles.iconActionEdit} title="Edit" onClick={onEdit}>
          <FontAwesomeIcon icon={faPenToSquare} />
        </button>
      )}
      <button type="button" className={styles.iconActionNote} title="Add Note" onClick={onAddNote}>
        <FontAwesomeIcon icon={faCommentDots} />
      </button>
      {canRaiseRma && (
        <button
          type="button"
          className={styles.iconActionRma}
          title="Raise RMA"
          onClick={onRaiseRma}
        >
          <FontAwesomeIcon icon={faRotateLeft} />
        </button>
      )}
      {canRegisterLocation && (
        <button
          type="button"
          className={styles.iconActionLocation}
          title="Register Location"
          onClick={onRegisterLocation}
        >
          <FontAwesomeIcon icon={faLocationDot} />
        </button>
      )}
    </div>
  )
}

export default IncidentActionsMenu
