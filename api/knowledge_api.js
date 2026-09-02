import { apiUrl, tenant } from '@/lib/config'
import { getUserDetails } from '@/lib/auth'
import Swal from 'sweetalert2'

const authHeaders = (extra = {}) => {
  const details = getUserDetails()
  const headers = new Headers()
  headers.append('X-Tenant', '' + tenant + '')
  headers.append('Authorization', 'Bearer ' + details?.token + '')
  Object.entries(extra).forEach(([k, v]) => headers.append(k, v))
  return headers
}

export const createKnowledgeArticle = async (article, router, onSuccess) => {
  const details = getUserDetails()
  const raw = JSON.stringify({
    title: article.title,
    description: article.description,
    category: article.category,
    tags: article.tags,
    visibility: article.visibility,
    status: article.status,
    userId: details?.id,
  })

  try {
    const response = await fetch(apiUrl + '/auth/knowledge/create', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: raw,
      redirect: 'follow',
    })
    if (response.status === 401) {
      router.push('/')
      return
    }
    const data = await response.json()
    if (data.statusCode === 200) {
      Swal.fire('Success', data.message, 'success')
      onSuccess && onSuccess()
    } else {
      Swal.fire('Oops!', '' + data.message + '', 'warning')
    }
  } catch (error) {
    console.error('Error creating knowledge article:', error)
  }
}

export const editKnowledgeArticle = async (article, router, onSuccess) => {
  const raw = JSON.stringify({
    title: article.title,
    description: article.description,
    category: article.category,
    tags: article.tags,
    visibility: article.visibility,
  })

  try {
    const response = await fetch(apiUrl + '/auth/knowledge/edit?id=' + article.id, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: raw,
      redirect: 'follow',
    })
    if (response.status === 401) {
      router.push('/')
      return
    }
    const data = await response.json()
    if (data.statusCode === 200) {
      Swal.fire('Success', data.message, 'success')
      onSuccess && onSuccess()
    } else {
      Swal.fire('Oops!', '' + data.message + '', 'warning')
    }
  } catch (error) {
    console.error('Error editing knowledge article:', error)
  }
}

export const setKnowledgeArticleStatus = async (id, status, router, onSuccess) => {
  try {
    const response = await fetch(apiUrl + '/auth/knowledge/set-status?id=' + id, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ status }),
      redirect: 'follow',
    })
    if (response.status === 401) {
      router.push('/')
      return
    }
    const data = await response.json()
    if (data.statusCode === 200) {
      onSuccess && onSuccess()
    } else {
      Swal.fire('Oops!', '' + data.message + '', 'warning')
    }
  } catch (error) {
    console.error('Error updating article status:', error)
  }
}

export const searchKnowledgeArticles = async (query, router, limit = 10) => {
  try {
    const response = await fetch(
      apiUrl + '/auth/knowledge/search?q=' + encodeURIComponent(query) + '&limit=' + limit,
      { method: 'GET', headers: authHeaders(), redirect: 'follow' },
    )
    if (response.status === 401) {
      router.push('/')
      return []
    }
    const data = await response.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error searching knowledge base:', error)
    return []
  }
}

export const sendKnowledgeFeedback = async (id, helpful, router) => {
  try {
    const response = await fetch(apiUrl + '/auth/knowledge/feedback?id=' + id, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ helpful }),
      redirect: 'follow',
    })
    if (response.status === 401) {
      router.push('/')
    }
  } catch (error) {
    console.error('Error sending feedback:', error)
  }
}
