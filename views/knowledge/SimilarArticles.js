import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { searchKnowledgeArticles } from '@/api/knowledge_api'
import styles from './knowledge.module.scss'

// Drop-in suggestion box: given free-text (e.g. an incident's problem description),
// debounced-searches the knowledge base and links to matching published articles.
// Used to surface "similar resolved requests" while a technician or end user is
// typing up a new ticket, so recurring issues get resolved from existing KB content.
const SimilarArticles = ({ query, limit = 5 }) => {
  const router = useRouter()
  const [results, setResults] = useState([])

  useEffect(() => {
    const trimmed = (query || '').trim()
    if (trimmed.length < 4) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      const data = await searchKnowledgeArticles(trimmed, router, limit)
      setResults(data)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  if (!results.length) return null

  return (
    <div style={{ marginTop: 8 }}>
      <div className={styles.filterLabel} style={{ marginBottom: 6 }}>
        Similar resolved articles
      </div>
      <div className={styles.tagRow} style={{ flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
        {results.map((a) => (
          <span
            key={a.id}
            className={styles.tag}
            style={{ cursor: 'pointer' }}
            onClick={() => window.open(`/knowledge/${a.id}`, '_blank')}
          >
            {a.title}
          </span>
        ))}
      </div>
    </div>
  )
}

export default SimilarArticles
