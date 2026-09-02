import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import {
  createKnowledgeArticle,
  editKnowledgeArticle,
  setKnowledgeArticleStatus,
} from '@/api/knowledge_api'
import Pagination from '@/components/ui/Pagination'
import KnowledgeArticleModal from './KnowledgeArticleModal'
import styles from './knowledge.module.scss'

const statusClass = {
  DRAFT: 'statusDraft',
  REVIEW: 'statusReview',
  PUBLISHED: 'statusPublished',
  ARCHIVED: 'statusArchived',
}

const Knowledge = () => {
  const router = useRouter()
  const details = getUserDetails()
  const [articles, setArticles] = useState({})
  const [currentPage, setCurrentPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const canManage =
    details?.roles?.includes('ROLE_ADMIN') ||
    details?.roles?.includes('ROLE_USER') ||
    details?.roles?.includes('ROLE_MODERATOR')

  const [showCreate, setShowCreate] = useState(false)
  const [editArticle, setEditArticle] = useState(null)

  const getAll = async (page, size, status = statusFilter) => {
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')

    try {
      const url =
        apiUrl +
        '/auth/knowledge/get-all-page?page=' +
        page +
        '&size=' +
        size +
        (status ? '&status=' + status : '')
      const response = await fetch(url, { method: 'GET', headers: myHeaders, redirect: 'follow' })
      if (response.status === 401) {
        router.push('/')
        return
      }
      const data = await response.json()
      if (data !== null) setArticles(data)
    } catch (error) {
      console.error('Error fetching knowledge articles:', error)
    }
  }

  const runSearch = async () => {
    if (!search.trim()) {
      setCurrentPage(0)
      getAll(0, 10)
      return
    }
    const myHeaders = new Headers()
    myHeaders.append('X-Tenant', '' + tenant + '')
    myHeaders.append('Authorization', 'Bearer ' + details?.token + '')
    try {
      const response = await fetch(
        apiUrl + '/auth/knowledge/search?q=' + encodeURIComponent(search) + '&limit=50',
        { method: 'GET', headers: myHeaders, redirect: 'follow' },
      )
      if (response.status === 401) {
        router.push('/')
        return
      }
      const data = await response.json()
      setArticles({ content: data, totalPages: 1, number: 0, size: data.length })
      setCurrentPage(0)
    } catch (error) {
      console.error('Error searching knowledge base:', error)
    }
  }

  const gotToPage = (pageNo) => {
    getAll(pageNo, 10)
    setCurrentPage(pageNo)
  }

  const viewArticle = (id) => router.push(`/knowledge/${id}`)

  const handleCreate = (values) => {
    createKnowledgeArticle(values, router, () => {
      setShowCreate(false)
      getAll(0, 10)
    })
  }

  const handleEdit = (values) => {
    editKnowledgeArticle({ ...values, id: editArticle.id }, router, () => {
      setEditArticle(null)
      getAll(currentPage, 10)
    })
  }

  const handlePublish = (id) => {
    setKnowledgeArticleStatus(id, 'PUBLISHED', router, () => getAll(currentPage, 10))
  }

  const handleArchive = (id) => {
    setKnowledgeArticleStatus(id, 'ARCHIVED', router, () => getAll(currentPage, 10))
  }

  useEffect(() => {
    getAll(0, 10)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Knowledge Base</h1>
          <p className={styles.pageSubtitle}>Articles, solutions, and known errors</p>
        </div>
        {canManage && (
          <button type="button" className={styles.addBtn} onClick={() => setShowCreate(true)}>
            + New Article
          </button>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.filterBar}>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Search</label>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="Title, keywords, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            />
          </div>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Status</label>
            <select
              className={styles.filterSelect}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(0)
                getAll(0, 10, e.target.value)
              }}
            >
              <option value="">All</option>
              <option value="DRAFT">Draft</option>
              <option value="REVIEW">Review</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <button type="button" className={styles.applyBtn} onClick={runSearch}>
            Search
          </button>
          <button
            type="button"
            className={styles.filterClear}
            onClick={() => {
              setSearch('')
              setStatusFilter('')
              setCurrentPage(0)
              getAll(0, 10, '')
            }}
          >
            Clear
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Article</th>
                <th>Category</th>
                <th>Tags</th>
                <th>Status</th>
                <th>Views</th>
                <th>Updated</th>
                {canManage && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {articles.content?.map((a) => (
                <tr key={a.id}>
                  <td className={styles.titleCell} onClick={() => viewArticle(a.id)}>
                    {a.title}
                  </td>
                  <td className={styles.email}>{a.category}</td>
                  <td>
                    <div className={styles.tagRow}>
                      {(a.tags || []).map((t) => (
                        <span key={t} className={styles.tag}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={styles[statusClass[a.status] || 'statusDraft']}>{a.status}</span>
                  </td>
                  <td className={styles.email}>{a.viewCount}</td>
                  <td className={styles.email}>
                    {a.modifyDate ? new Date(a.modifyDate).toLocaleDateString() : ''}
                  </td>
                  {canManage && (
                    <td>
                      <button type="button" className={styles.editBtn} onClick={() => setEditArticle(a)}>
                        Edit
                      </button>
                      {a.status !== 'PUBLISHED' && (
                        <button
                          type="button"
                          className={styles.editBtn}
                          onClick={() => handlePublish(a.id)}
                        >
                          Publish
                        </button>
                      )}
                      {a.status !== 'ARCHIVED' && (
                        <button
                          type="button"
                          className={styles.editBtn}
                          onClick={() => handleArchive(a.id)}
                        >
                          Archive
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {articles.content?.length === 0 && (
            <div className={styles.emptyState}>No knowledge articles found</div>
          )}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={articles.totalPages}
          onPageChange={gotToPage}
          variant="styled"
          styles={styles}
        />
      </div>

      {showCreate && (
        <KnowledgeArticleModal
          title="New Knowledge Article"
          submitLabel="Create"
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}

      {editArticle && (
        <KnowledgeArticleModal
          title="Edit Knowledge Article"
          submitLabel="Save"
          initialValues={editArticle}
          onClose={() => setEditArticle(null)}
          onSubmit={handleEdit}
        />
      )}
    </div>
  )
}

export default Knowledge
