import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ClusterHeader from './ClusterHeader'
import ConfirmDeleteForm from '@/components/ConfirmDeleteForm'
import { deleteCluster, createPost } from '../actions'
import { BLOG } from '@/lib/content'

export default async function ClusterPage({
  params,
}: {
  params: Promise<{ cluster: string }>
}) {
  const { cluster: clusterSlug } = await params
  const supabase = await createClient()
  const admin = await isAdmin()

  const isUncategorized = clusterSlug === 'uncategorized'

  let cluster = null
  if (!isUncategorized) {
    const { data } = await supabase
      .from('blog_clusters')
      .select('*')
      .eq('slug', clusterSlug)
      .single()
    if (!data) notFound()
    cluster = data
  }

  const query = supabase
    .from('blog_posts')
    .select('*')
    .order('published_at', { ascending: false })

  const { data: posts } = isUncategorized
    ? await query.is('cluster_id', null)
    : await query.eq('cluster_id', cluster!.id)

  const visiblePosts = admin ? (posts ?? []) : (posts ?? []).filter(p => p.published)

  return (
    <div className="window">
      <div className="window-titlebar">
        <span>📁 blog/{cluster?.slug ?? 'uncategorized'}</span>
        <span style={{ fontFamily: 'Courier New, monospace' }}>_ □ ✕</span>
      </div>
      <div className="window-body">
        <p style={{ marginBottom: 8 }}>
          <Link href="/blog" style={{ fontFamily: 'Courier New, monospace', fontSize: 12 }}>← back to blog</Link>
        </p>

        {cluster ? (
          <ClusterHeader cluster={cluster} isAdmin={admin} />
        ) : (
          <h1 style={{ fontFamily: 'Times New Roman, serif', fontSize: 26, color: 'var(--accent)', textTransform: 'uppercase', margin: 0 }}>
            {BLOG.uncategorizedLabel}
          </h1>
        )}

        <hr style={{ border: 'none', borderTop: '2px dashed var(--accent)', margin: '14px 0' }} />

        {visiblePosts.length === 0 ? (
          <p style={{ fontStyle: 'italic', color: '#777' }}>{BLOG.emptyCluster}</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {visiblePosts.map(post => (
              <li key={post.id} style={{ padding: '5px 0', borderBottom: '1px dotted #aaa', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span>
                  <span style={{ color: 'var(--accent)', marginRight: 6 }}>▪</span>
                  <Link href={`/blog/${clusterSlug}/${post.slug}`}>{post.title}</Link>
                  {!post.published && admin && (
                    <span style={{ marginLeft: 8, fontFamily: 'Courier New, monospace', fontSize: 11, background: '#ffeb3b', padding: '0 4px', border: '1px solid #b8860b' }}>
                      {BLOG.draftBadge}
                    </span>
                  )}
                </span>
                <span style={{ fontFamily: 'Courier New, monospace', fontSize: 12, color: '#666', flexShrink: 0 }}>
                  {post.published_at
                    ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : ''}
                </span>
              </li>
            ))}
          </ul>
        )}

        {admin && (
          <div style={{ marginTop: 24, paddingTop: 14, borderTop: '1px dashed #888', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <form action={createPost} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="hidden" name="cluster_id" value={cluster?.id ?? ''} />
              <input name="title" placeholder={BLOG.postTitlePlaceholder} required style={{ width: 180 }} />
              <button type="submit" style={{ fontWeight: 'bold' }}>{BLOG.newPostInline}</button>
            </form>
            {cluster && (
              <ConfirmDeleteForm
                action={deleteCluster.bind(null, cluster.id)}
                confirmMessage={BLOG.confirmDeleteCluster}
                label={BLOG.delClusterButton}
                style={{ fontFamily: 'Courier New, monospace', fontSize: 12, color: '#a00' }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
