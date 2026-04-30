export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type ArtworkFile = {
  url: string
  type: 'image' | 'video' | 'audio' | 'embed'
  caption?: string
}

export type TrackerValue =
  | { bool: boolean }
  | { num: number }
  | { text: string }

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          is_admin: boolean
          created_at: string
        }
        Insert: {
          id: string
          is_admin?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          is_admin?: boolean
          created_at?: string
        }
        Relationships: []
      }
      blog_clusters: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          id: string
          cluster_id: string | null
          title: string
          slug: string
          body_md: string
          cover_url: string | null
          tags: string[]
          published: boolean
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cluster_id?: string | null
          title: string
          slug: string
          body_md?: string
          cover_url?: string | null
          tags?: string[]
          published?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cluster_id?: string | null
          title?: string
          slug?: string
          body_md?: string
          cover_url?: string | null
          tags?: string[]
          published?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'blog_posts_cluster_id_fkey'
            columns: ['cluster_id']
            isOneToOne: false
            referencedRelation: 'blog_clusters'
            referencedColumns: ['id']
          }
        ]
      }
      mediums: {
        Row: {
          id: string
          name: string
          slug: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      artworks: {
        Row: {
          id: string
          medium_id: string | null
          title: string
          year: number | null
          description: string | null
          files: Json
          sort_order: number
          likes: number
          tags: string[]
          created_at: string
        }
        Insert: {
          id?: string
          medium_id?: string | null
          title: string
          year?: number | null
          description?: string | null
          files?: Json
          sort_order?: number
          likes?: number
          tags?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          medium_id?: string | null
          title?: string
          year?: number | null
          description?: string | null
          files?: Json
          sort_order?: number
          likes?: number
          tags?: string[]
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'artworks_medium_id_fkey'
            columns: ['medium_id']
            isOneToOne: false
            referencedRelation: 'mediums'
            referencedColumns: ['id']
          }
        ]
      }
      trackers: {
        Row: {
          id: string
          name: string
          slug: string
          color: string
          icon: string | null
          value_type: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          color?: string
          icon?: string | null
          value_type?: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          color?: string
          icon?: string | null
          value_type?: string
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      tracker_entries: {
        Row: {
          id: string
          tracker_id: string
          date: string
          value: Json
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tracker_id: string
          date: string
          value: Json
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tracker_id?: string
          date?: string
          value?: Json
          note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tracker_entries_tracker_id_fkey'
            columns: ['tracker_id']
            isOneToOne: false
            referencedRelation: 'trackers'
            referencedColumns: ['id']
          }
        ]
      }
      links: {
        Row: {
          id: string
          url: string
          title: string
          description: string | null
          tags: string[]
          found_at: string
          created_at: string
        }
        Insert: {
          id?: string
          url: string
          title: string
          description?: string | null
          tags?: string[]
          found_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          url?: string
          title?: string
          description?: string | null
          tags?: string[]
          found_at?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      increment_artwork_likes: {
        Args: { artwork_id: string; delta: number }
        Returns: number
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience row types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type BlogCluster = Database['public']['Tables']['blog_clusters']['Row']
export type BlogPost = Database['public']['Tables']['blog_posts']['Row']
export type Medium = Database['public']['Tables']['mediums']['Row']
// files is Json in DB, cast to ArtworkFile[] at runtime
export type ArtworkRow = Database['public']['Tables']['artworks']['Row']
export type Artwork = Omit<ArtworkRow, 'files'> & { files: ArtworkFile[] }
export type Tracker = Database['public']['Tables']['trackers']['Row']
export type TrackerEntry = Database['public']['Tables']['tracker_entries']['Row']
export type Link = Database['public']['Tables']['links']['Row']
