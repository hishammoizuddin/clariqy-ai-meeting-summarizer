export type UploadResponse = {
  meeting_id: string
  summary: string
  transcript: string
}

export type AskResponse = {
  answer: string
}

export type MeetingListItem = {
  meeting_id: string
  source_filename: string | null
  created_at: string
}
