import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import PostAdminPanel from './PostAdminPanel'
import { BLOG } from '@/lib/content'

export default async function PostPage({
  params,
}: {
  params: Promise<{ cluster: string; slug: string }>
}) {
  const { cluster: clusterSlug, slug } = await params
  const supabase = await createClient()
  const admin = await isAdmin()

  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!post) notFound()
  if (!post.published && !admin) notFound()

  let cluster = null
  if (post.cluster_id) {
    const { data } = await supabase.from('blog_clusters').select('*').eq('id', post.cluster_id).single()
    cluster = data
  }

  const { data: allClusters } = await supabase
    .from('blog_clusters')
    .select('id, name, slug')
    .order('name')

  return (
    <article className="window">
      <div className="window-titlebar">
        <span>📄 {post.slug}.htm</span>
        <span style={{ fontFamily: 'Courier New, monospace' }}>_ □ ✕</span>
      </div>
      <div className="window-body">
        <p style={{ fontFamily: 'Courier New, monospace', fontSize: 12, marginBottom: 12 }}>
          <Link href="/blog">blog</Link>
          {' / '}
          <Link href={`/blog/${clusterSlug}`}>{cluster?.name ?? clusterSlug}</Link>
        </p>

        {!post.published && admin && (
          <p style={{
            display: 'inline-block',
            background: '#ffeb3b',
            border: '2px solid #b8860b',
            padding: '2px 8px',
            fontFamily: 'Courier New, monospace',
            fontSize: 12,
            fontWeight: 'bold',
            marginBottom: 12,
          }}>
            {BLOG.draftWarning}
          </p>
        )}

        {post.cover_url && (
          <div style={{ margin: '12px 0', border: '4px ridge var(--bevel-darker)', background: '#fff', padding: 4 }}>
            <Image
              src={post.cover_url}
              alt={post.title}
              width={800}
              height={500}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>
        )}

        <h1 style={{
          fontFamily: 'Times New Roman, serif',
          fontSize: 32,
          fontWeight: 'bold',
          color: 'var(--ink)',
          margin: '8px 0 4px',
          lineHeight: 1.2,
        }}>
          {post.title}
        </h1>

        <div style={{ fontFamily: 'Courier New, monospace', fontSize: 12, color: '#555', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          {post.published_at && (
            <span>
              📅 {new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          )}
          {/* Reading time — assumes 220 words per minute */}
          {post.body_md && (
            <span title={`${post.body_md.split(/\s+/).filter(Boolean).length} words`}>
              ⏱ {Math.max(1, Math.round(post.body_md.split(/\s+/).filter(Boolean).length / 220))} min read
            </span>
          )}
          {/* Updated indicator (only if updated >24h after publish) */}
          {post.published_at && post.updated_at &&
            new Date(post.updated_at).getTime() - new Date(post.published_at).getTime() > 86400000 && (
            <span style={{ color: '#888' }}>
              ✎ updated {new Date(post.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
          {post.tags.length > 0 && (
            <span style={{ marginLeft: 12 }}>
              {post.tags.map(tag => (
                <span key={tag} style={{
                  display: 'inline-block',
                  background: '#e0d8c0',
                  border: '1px solid #888',
                  padding: '0 6px',
                  marginRight: 4,
                  fontSize: 11,
                }}>
                  #{tag}
                </span>
              ))}
            </span>
          )}
        </div>

        <hr style={{ border: 'none', borderTop: '2px dashed var(--accent)', margin: '8px 0 20px' }} />

        <div className="prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
            {post.body_md || BLOG.emptyPostBody}
          </ReactMarkdown>
        </div>

        {admin && (
          <PostAdminPanel post={post} clusterSlug={clusterSlug} allClusters={allClusters ?? []} />
        )}
      </div>
    </article>
  )
}
