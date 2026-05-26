import React from 'react'
import type { Collection, MeetingListItem } from '../types'
import {
  assignMeetingToCollection,
  listMeetings,
  updateCollection,
} from '../lib/api'
import {
  FolderOpen,
  Check,
  Edit2,
  X,
  Loader2,
  Calendar,
  MessageSquareDiff,
  Info,
  ExternalLink,
} from 'lucide-react'
import { format } from 'date-fns'

interface Props {
  collection: Collection
  onCollectionUpdated: (updated: Collection) => void
  onOpenMeeting: (meeting_id: string, title: string) => void
  activeMeetingId?: string | null
  reloadSignal?: number
}

export default function CollectionView({
  collection,
  onCollectionUpdated,
  onOpenMeeting,
  activeMeetingId,
  reloadSignal,
}: Props) {
  const [meetings, setMeetings] = React.useState<MeetingListItem[]>([])
  const [loading, setLoading] = React.useState(false)

  // Edit header
  const [editing, setEditing] = React.useState(false)
  const [editName, setEditName] = React.useState(collection.name)
  const [editEmoji, setEditEmoji] = React.useState(collection.emoji || '📁')
  const [editDesc, setEditDesc] = React.useState(collection.description || '')
  const [saving, setSaving] = React.useState(false)

  const [removingId, setRemovingId] = React.useState<string | null>(null)

  const fetchMeetings = React.useCallback(async () => {
    setLoading(true)
    try {
      const all = await listMeetings()
      setMeetings((all || []).filter((m: MeetingListItem) => m.collection_id === collection.id))
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [collection.id])

  React.useEffect(() => { fetchMeetings() }, [fetchMeetings, reloadSignal])

  // Keep edit fields in sync if collection prop changes externally
  React.useEffect(() => {
    setEditName(collection.name)
    setEditEmoji(collection.emoji || '📁')
    setEditDesc(collection.description || '')
  }, [collection])

  async function handleSave() {
    if (!editName.trim()) return
    setSaving(true)
    try {
      const updated = await updateCollection(collection.id, {
        name: editName.trim(),
        emoji: editEmoji || '📁',
        description: editDesc.trim() || undefined,
      })
      onCollectionUpdated(updated)
      setEditing(false)
    } catch (e: any) { alert(e?.message || 'Save failed') }
    finally { setSaving(false) }
  }

  async function handleRemove(meeting_id: string) {
    setRemovingId(meeting_id)
    try {
      await assignMeetingToCollection(meeting_id, null)
      setMeetings(prev => prev.filter(m => m.meeting_id !== meeting_id))
      onCollectionUpdated({ ...collection, meeting_count: Math.max(0, (collection.meeting_count ?? 1) - 1) })
    } catch (e: any) { alert(e?.message || 'Failed to remove') }
    finally { setRemovingId(null) }
  }

  return (
    <div className="section h-full flex flex-col">
      {/* Collection header */}
      <div className="section-header flex-col gap-3 pb-4">
        {editing ? (
          <div className="w-full space-y-2">
            <div className="flex items-center gap-2">
              <input value={editEmoji} onChange={e => setEditEmoji(e.target.value)} maxLength={4}
                className="w-12 text-center text-xl bg-white border border-gray-200 rounded-xl py-2 focus:outline-none focus:ring-1 focus:ring-black" />
              <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
                className="flex-1 text-sm font-bold bg-white border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black" />
            </div>
            <input value={editDesc} onChange={e => setEditDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full text-xs bg-white border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black placeholder:text-gray-400" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-1">
                <X size={11} /> Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !editName.trim()}
                className="px-3 py-1.5 text-xs rounded-xl bg-black text-white hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1">
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Save
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 w-full">
            <div className="text-3xl leading-none shrink-0 mt-0.5">{collection.emoji || '📁'}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-black tracking-tight truncate">{collection.name}</h2>
                <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-black transition-colors shrink-0">
                  <Edit2 size={13} />
                </button>
              </div>
              {collection.description && (
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{collection.description}</p>
              )}
              <p className="text-[11px] text-gray-400 mt-1 font-medium">
                {meetings.length} session{meetings.length !== 1 ? 's' : ''}
                {meetings.length > 0 && ` · ${format(new Date(meetings[meetings.length - 1].created_at), 'MMM d')} – ${format(new Date(meetings[0].created_at), 'MMM d, yyyy')}`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Cross-session chat hint */}
      {meetings.length > 0 && (
        <div className="mx-4 mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-black text-white text-xs leading-relaxed">
          <MessageSquareDiff size={16} className="shrink-0 mt-0.5" />
          <span>
            <strong>Chat across all {meetings.length} sessions</strong> using the panel on the right →
            Ask questions that span every recording in this collection.
          </span>
        </div>
      )}

      {/* Sessions list */}
      <div className="section-body flex-1 min-h-0 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={22} className="animate-spin text-gray-300" />
          </div>
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center text-center py-10">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <FolderOpen className="text-gray-400" size={20} />
            </div>
            <p className="text-sm font-semibold text-gray-600">No sessions yet</p>
            <p className="text-xs text-gray-400 mt-1 max-w-[240px] leading-relaxed">
              Move recordings into this collection using the <strong>folder icon</strong> on any session in the sidebar.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Sessions in this collection</p>
            {meetings.map((m, i) => {
              const isActive = m.meeting_id === activeMeetingId
              return (
                <div key={m.meeting_id}
                  className={`group flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-gray-100 border-gray-300 ring-1 ring-black/10'
                      : 'bg-white/60 border-gray-100 hover:border-gray-200 hover:shadow-sm'
                  }`}
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-black truncate">{m.source_filename || 'Untitled Recording'}</p>
                    <div className="flex items-center gap-1 mt-0.5 text-[11px] text-gray-400">
                      <Calendar size={10} />
                      {format(new Date(m.created_at), 'MMM d, yyyy · h:mm a')}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onOpenMeeting(m.meeting_id, m.source_filename || 'Untitled')}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-black text-white hover:bg-gray-800 transition-all"
                      title="Open & view this session"
                    >
                      Open <ExternalLink size={11} />
                    </button>
                    <button
                      onClick={() => handleRemove(m.meeting_id)}
                      disabled={removingId === m.meeting_id}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Remove from collection"
                    >
                      {removingId === m.meeting_id ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {meetings.length > 0 && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-500">
            <Info size={13} className="shrink-0 mt-0.5" />
            <span>To add more sessions, click the <strong>folder icon</strong> on any recording in the sidebar and select this collection.</span>
          </div>
        )}
      </div>
    </div>
  )
}
