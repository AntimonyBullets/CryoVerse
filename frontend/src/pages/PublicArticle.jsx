import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import { Alert, Spinner } from '../components/ui'
import { getPublishedArticle } from '../services/articleService.js'

const VALID_TARGET_TYPES = ['resource', 'expedition']

/** Fully public page. Only ever shows an article that the backend confirms is published. */
export default function PublicArticle() {
  const { targetType, id } = useParams()
  const [state, setState] = useState({ status: 'loading', article: null })

  useEffect(() => {
    let active = true
    if (!VALID_TARGET_TYPES.includes(targetType)) {
      setState({ status: 'not-found', article: null })
      return undefined
    }
    setState({ status: 'loading', article: null })
    getPublishedArticle(targetType, id)
      .then((article) => { if (active) setState({ status: article ? 'ready' : 'not-found', article }) })
      .catch(() => { if (active) setState({ status: 'not-found', article: null }) })
    return () => { active = false }
  }, [targetType, id])

  if (state.status === 'loading') return <section className="section"><div className="container page-loading"><Spinner label="Loading article" /></div></section>

  if (state.status === 'not-found') return <section className="section"><div className="container">
    <Alert variant="warning" title="Article not found">This article does not exist or has not been published yet.</Alert>
    <p><Link to="/repository">Back to repository</Link></p>
  </div></section>

  const { article } = state
  const backTo = targetType === 'resource' ? `/repository/${id}` : `/expeditions/${id}`

  return <>
    <PageHeader eyebrow="Article" title="Cryoverse feature" subtitle={article.publishedAt ? `Published ${new Date(article.publishedAt).toLocaleDateString()}` : undefined} />
    <section className="section"><div className="container">
      <article className="public-article">
        {article.content.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </article>
      <p><Link to={backTo}>Back to {targetType}</Link></p>
    </div></section>
  </>
}
