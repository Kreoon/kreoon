export type Platform = 'youtube' | 'instagram' | 'tiktok' | 'meta-ads' | 'tiktok-ads'

export interface VideoMetadata {
  platform: Platform
  url: string
  videoUrl?: string
  title?: string
  caption?: string
  author?: string
  authorUrl?: string
  views?: number
  likes?: number
  comments?: number
  shares?: number
  duration?: number
  thumbnail?: string
  adCopy?: string
  adType?: string
  capturedAt: string
}

export interface CaptureResult {
  transcription?: string
  viralScore?: number
  hooks?: string[]
  structure?: string
  suggestions?: string[]
  generatedScript?: string
  contentItemId?: string
  error?: string
}

export interface KreoonProject {
  id: string
  title: string
  status: string
}

export interface KreoonProduct {
  id: string
  name: string
  client_id: string
  client_name?: string
}

export interface KreoonNotification {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  created_at: string
  link?: string
}

export interface AuthSession {
  access_token: string
  refresh_token: string
  user: {
    id: string
    email: string
  }
  organizationId?: string
  organizationName?: string
  expiresAt: number
}
