import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import { Alert, Badge, Card, EmptyState, Input, Spinner } from '../components/ui'
import { getPublishedArticles } from '../services/articleService.js'

export default function Articles() {
  const [params, setParams] = useSearchParams()
  const [filters, setFilters] = useState({
    search: params.get('search') || '',
    targetType: params.get('targetType') || ''
  })
  const [articles, setArticles] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    getPublishedArticles(filters)
      .then((data) => {
        if (active) setArticles(data)
      })
      .catch((err) => {
        if (active) setError(err)
      })
    return () => { active = false }
  }, [filters])

  function update(key, value) {
    const next = { ...filters, [key]: value }
    setArticles(null)
    setError(null)
    setFilters(next)
    setParams(Object.fromEntries(Object.entries(next).filter(([, val]) => val)))
  }

  return (
    <>
      <PageHeader
        eyebrow="Publications"
        title="Published Articles"
        subtitle="Explore published polar research articles, expedition summaries, and peer-reviewed logs."
      />
      <section className="section">
        <div className="container">
          <div className="archive-frame">
            <div className="archive-frame__index">03 <span>PUBLISHED ARTICLES</span></div>
            <div className="repository-filters">
              <Input
                label="Search"
                value={filters.search}
                onChange={(event) => update('search', event.target.value)}
                placeholder="Search title, summary, keywords…"
              />
              <div className="field">
                <label className="field__label" htmlFor="article-target-type">
                  Source Type
                </label>
                <select
                  id="article-target-type"
                  className="field__input"
                  value={filters.targetType}
                  onChange={(event) => update('targetType', event.target.value)}
                >
                  <option value="">All source types</option>
                  <option value="resource">Resource Articles</option>
                  <option value="expedition">Expedition Articles</option>
                </select>
              </div>
            </div>

            {error && (
              <Alert variant="danger" title="Couldn't load published articles">
                {error.message || 'Failed to fetch published articles.'}
              </Alert>
            )}

            {!error && !articles && (
              <div className="page-loading">
                <Spinner label="Loading articles" />
              </div>
            )}

            {!error && articles?.length === 0 && (
              <EmptyState title="No published articles found">
                Try broadening your search criteria or clearing your filters.
              </EmptyState>
            )}

            {!error && articles?.length > 0 && (
              <div className="grid grid--3">
                {articles.map((article) => {
                  const id = `${article.targetType}-${article.targetId}`
                  const targetLabel = article.targetType === 'resource' ? 'Resource' : 'Expedition'
                  const publishedDateStr = article.publishedAt
                    ? new Date(article.publishedAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })
                    : ''

                  return (
                    <Card
                      key={id}
                      as={Link}
                      to={`/articles/${article.targetType}/${article.targetId}`}
                      className="resource-card"
                    >
                      <div className="resource-card__meta">
                        <Badge variant="info">{targetLabel}</Badge>
                        {article.category && <Badge variant="neutral">{article.category}</Badge>}
                      </div>
                      <h3>{article.title}</h3>
                      <p className="text-muted">
                        {[
                          publishedDateStr && `Published ${publishedDateStr}`,
                          article.location || article.source
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </Card>
                  )
                })}
              </div>
            )}
            <div className="archive-frame__note">Synthesized research / articles / logs</div>
          </div>
        </div>
      </section>
    </>
  )
}
