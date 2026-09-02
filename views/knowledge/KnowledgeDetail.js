import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import { sendKnowledgeFeedback } from '@/api/knowledge_api'
import styles from './knowledge.module.scss'

const statusClass = {
  DRAFT: 'statusDraft',
  REVIEW: 'statusReview',
  PUBLISHED: 'statusPublished',
  ARCHIVED: 'statusArchived',
}

const KnowledgeDetail = () => {
  const router = useRouter()
  const { id } = router.query
  const details = getUserDetails()
  const [article, setArticle] = useState(null)
  const [feedbackGiven, setFeedbackGiven] = useState(false)

  const getDetail = async () => {
    if (!id) return
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    try {
      const response = await fetch(apiUrl + '/auth/service/knowledge/get-detail?id=' + id, {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow',
      })
      if (response.status === 401) {
        router.push('/')
        return
      }
      if (response.status === 404) {
        setArticle(null)
        return
      }
      const data = await response.json()
      setArticle(data)
    } catch (error) {
      console.error('Error fetching article:', error)
    }
  }

  const giveFeedback = (helpful) => {
    sendKnowledgeFeedback(id, helpful, router)
    setFeedbackGiven(true)
  }

  useEffect(() => {
    getDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!article) {
    return (
      <div className={styles.page}>
        <span className={styles.backLink} onClick={() => router.push('/knowledge')}>
          &larr; Back to Knowledge Base
        </span>
        <div className={styles.detailCard}>
          <div className={styles.emptyState}>Loading article...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <span className={styles.backLink} onClick={() => router.push('/knowledge')}>
        &larr; Back to Knowledge Base
      </span>
      <div className={styles.detailCard}>
        <div className={styles.detailMeta}>
          <span className={styles[statusClass[article.status] || 'statusDraft']}>{article.status}</span>
          <span className={styles.tag}>{article.category}</span>
          {(article.tags || []).map((t) => (
            <span key={t} className={styles.tag}>
              {t}
            </span>
          ))}
        </div>
        <h1 className={styles.detailTitle}>{article.title}</h1>
        <div className={styles.detailBody}>{article.description}</div>
        <div className={styles.detailStats}>
          <span>{article.viewCount} views</span>
          <span>{article.helpfulCount} found this helpful</span>
          <span>Article {article.articleId}</span>
          {!feedbackGiven ? (
            <>
              <span>Was this helpful?</span>
              <button type="button" className={styles.feedbackBtn} onClick={() => giveFeedback(true)}>
                Yes
              </button>
              <button type="button" className={styles.feedbackBtn} onClick={() => giveFeedback(false)}>
                No
              </button>
            </>
          ) : (
            <span>Thanks for the feedback!</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default KnowledgeDetail
