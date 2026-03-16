export type TranscriptSegment = {
  speaker_id?: string
  speaker: string
  text: string
  start: number
  end: number
}

export type SpeakerProfile = {
  speaker_id: string
  speaker_label: string
  assigned_name?: string | null
  sample_text: string
  first_timestamp: number
  turn_count: number
  suggested_names?: string[]
  samples?: {
    start: number
    end: number
    text: string
  }[]
}

export type UploadResponse = {
  meeting_id: string
  source_filename: string
  summary: string
  transcript: string
  source_type?: 'upload' | 'live'
  language?: string | null
  transcript_segments?: TranscriptSegment[] | null
  speakers?: string[]
  duration_seconds?: number | null
  speaker_assignments?: Record<string, string>
  expected_speakers?: string[]
  speaker_profiles?: SpeakerProfile[]
  media_available?: boolean
  media_kind?: 'audio' | 'video' | null
}

export type AskResponse = {
  answer: string
}

export type MeetingListItem = {
  meeting_id: string
  source_filename: string | null
  created_at: string
}

export type LiveSessionResponse = {
  client_secret: string
  expires_at: number
  session: Record<string, unknown>
}
