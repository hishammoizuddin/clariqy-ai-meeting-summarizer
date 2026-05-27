import React from 'react'
import {
  listMeetings,
  listCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  assignMeetingToCollection,
  downloadPdfUrl,
  renameRecord,
  deleteRecord,
} from '../lib/api'
import type { Collection, MeetingListItem } from '../types'
import { useToast } from '../context/ToastContext'
import {
  FolderOpen,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  FileDown,
  History,
  Calendar,
  Edit2,
  Loader2,
  Check,
  Trash2,
  X,
  FolderIcon,
  Layers,
  MessageSquareDiff,
} from 'lucide-react'
import { format } from 'date-fns'

interface Props {
  onOpenMeeting: (meeting_id: string, title: string) => void
  onOpenCollection: (collection: Collection) => void
  onDeleteMeeting?: (meeting_id: string) => void
  activeMeetingId?: string | null
  activeCollectionId?: number | null
  reloadSignal?: number
}

export default function KnowledgePanel({
  onOpenMeeting,
  onOpenCollection,
  onDeleteMeeting,
  activeMeetingId,
  activeCollectionId,
  reloadSignal,
}: Props) {
  const { toast, confirm } = useToast()
  const [meetings, setMeetings] = React.useState<MeetingListItem[]>([])
  const [collections, setCollections] = React.useState<Collection[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Expanded collection IDs
  const [expanded, setExpanded] = React.useState<Set<number>>(new Set())

  // Rename meeting
  const [renamingMeetingId, setRenamingMeetingId] = React.useState<string | null>(null)
  const [newMeetingName, setNewMeetingName] = React.useState('')
  const [isRenamingMeeting, setIsRenamingMeeting] = React.useState(false)
  const [deletingMeetingId, setDeletingMeetingId] = React.useState<string | null>(null)

  // New collection modal
  const [showNewCol, setShowNewCol] = React.useState(false)
  const [newColName, setNewColName] = React.useState('')
  const [newColEmoji, setNewColEmoji] = React.useState('📁')
  const [newColDesc, setNewColDesc] = React.useState('')
  const [creatingCol, setCreatingCol] = React.useState(false)

  // Rename collection
  const [renamingColId, setRenamingColId] = React.useState<number | null>(null)
  const [newColRename, setNewColRename] = React.useState('')
  const [isRenamingCol, setIsRenamingCol] = React.useState(false)

  // Move-to-collection dropdown
  const [movingMeetingId, setMovingMeetingId] = React.useState<string | null>(null)

  // Close dropdown on outside click
  React.useEffect(() => {
    if (!movingMeetingId) return
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-move-dropdown]')) {
        setMovingMeetingId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [movingMeetingId])

  const fetchAll = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [m, c] = await Promise.all([listMeetings(), listCollections()])
      setMeetings(m || [])
      setCollections(c || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { fetchAll() }, [fetchAll, reloadSignal])

  // ── helpers ────────────────────────────────────────────────────────────────

  function toggleExpand(id: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleRenameMeeting(id: string) {
    if (!newMeetingName.trim()) { setRenamingMeetingId(null); return }
    setIsRenamingMeeting(true)
    try {
      await renameRecord(id, newMeetingName.trim())
      setMeetings(prev => prev.map(m => m.meeting_id === id ? { ...m, source_filename: newMeetingName.trim() } : m))
    } catch (e: any) { console.error(e) }
    finally { setIsRenamingMeeting(false); setRenamingMeetingId(null) }
  }

  async function handleDeleteMeeting(id: string) {
    const ok = await confirm({ title: 'Delete recording?', message: 'This will permanently delete this recording. This action cannot be undone.', confirmLabel: 'Delete', destructive: true })
    if (!ok) return
    setDeletingMeetingId(id)
    try {
      await deleteRecord(id)
      setMeetings(prev => prev.filter(m => m.meeting_id !== id))
      if (onDeleteMeeting) onDeleteMeeting(id)
    } catch (e: any) { toast(e?.message || 'Failed to delete recording', 'error') }
    finally { setDeletingMeetingId(null) }
  }

  async function handleCreateCollection() {
    if (!newColName.trim()) return
    setCreatingCol(true)
    try {
      const col = await createCollection({ name: newColName.trim(), emoji: newColEmoji, description: newColDesc.trim() || undefined })
      setCollections(prev => [col, ...prev])
      setShowNewCol(false)
      setNewColName(''); setNewColEmoji('📁'); setNewColDesc('')
      setExpanded(prev => new Set([...prev, col.id]))
      toast('Collection created!', 'success')
    } catch (e: any) { toast(e?.message || 'Failed to create collection', 'error') }
    finally { setCreatingCol(false) }
  }

  async function handleRenameCollection(id: number) {
    if (!newColRename.trim()) { setRenamingColId(null); return }
    setIsRenamingCol(true)
    try {
      const updated = await updateCollection(id, { name: newColRename.trim() })
      setCollections(prev => prev.map(c => c.id === id ? updated : c))
    } catch (e: any) { console.error(e) }
    finally { setIsRenamingCol(false); setRenamingColId(null) }
  }

  async function handleDeleteCollection(id: number) {
    const ok = await confirm({ title: 'Delete collection?', message: 'The recordings inside will NOT be deleted — they will just become unorganized.', confirmLabel: 'Delete', destructive: true })
    if (!ok) return
    try {
      await deleteCollection(id)
      setCollections(prev => prev.filter(c => c.id !== id))
      setMeetings(prev => prev.map(m => m.collection_id === id ? { ...m, collection_id: null } : m))
    } catch (e: any) { toast(e?.message || 'Failed to delete collection', 'error') }
  }

  async function handleAssign(meeting_id: string, collection_id: number | null) {
    setMovingMeetingId(null)
    try {
      await assignMeetingToCollection(meeting_id, collection_id)
      setMeetings(prev => prev.map(m => m.meeting_id === meeting_id ? { ...m, collection_id } : m))
      toast('Moved to collection', 'success')
    } catch (e: any) { toast(e?.message || 'Failed to move recording', 'error') }
  }

  // ── derived ────────────────────────────────────────────────────────────────

  const collectionMap = React.useMemo(() => {
    const map: Record<number, MeetingListItem[]> = {}
    for (const m of meetings) {
      if (m.collection_id != null) {
        ;(map[m.collection_id] ??= []).push(m)
      }
    }
    return map
  }, [meetings])

  const uncollected = React.useMemo(
    () => meetings.filter(m => m.collection_id == null),
    [meetings]
  )

  // ── meeting row ────────────────────────────────────────────────────────────

  function MeetingRow({ m, inCollection }: { m: MeetingListItem; inCollection?: boolean }) {
    const isActive = m.meeting_id === activeMeetingId
    return (
      <div
        className={`group relative flex flex-col p-2.5 rounded-xl border transition-all cursor-pointer ${
          isActive
            ? 'bg-gray-100/80 border-gray-300 shadow-sm ring-1 ring-black/10'
            : 'bg-white/30 border-transparent hover:bg-white hover:border-gray-200 hover:shadow-sm'
        }`}
        onClick={e => {
          if ((e.target as HTMLElement).closest('button,a,input')) return
          onOpenMeeting(m.meeting_id, m.source_filename || 'Untitled')
        }}
      >
        {isActive && <div className="absolute inset-y-0 left-0 w-1 bg-black rounded-l-xl" />}
        <div className={`flex items-center gap-2 ${isActive ? 'pl-2' : ''}`}>
          <div className="flex-1 min-w-0">
            {renamingMeetingId === m.meeting_id ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={newMeetingName}
                  onChange={e => setNewMeetingName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRenameMeeting(m.meeting_id)
                    else if (e.key === 'Escape') setRenamingMeetingId(null)
                  }}
                  className="flex-1 text-xs font-semibold bg-white border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-black"
                  onClick={e => e.stopPropagation()}
                />
                <button disabled={isRenamingMeeting} onClick={e => { e.stopPropagation(); handleRenameMeeting(m.meeting_id) }} className="p-1 rounded bg-black text-white">
                  {isRenamingMeeting ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                </button>
              </div>
            ) : (
              <p className={`text-xs font-semibold truncate ${isActive ? 'text-black' : 'text-gray-700 group-hover:text-black'}`} title={m.source_filename || 'Untitled'}>
                {m.source_filename || 'Untitled Recording'}
              </p>
            )}
            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-gray-400">
              <Calendar size={9} />
              {format(new Date(m.created_at), 'MMM d, yyyy')}
            </div>
          </div>

          {/* Action row */}
          <div className="flex items-center shrink-0 gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Move to collection */}
            <div className="relative" data-move-dropdown>
              <button
                title="Move to collection"
                onClick={e => { e.stopPropagation(); setMovingMeetingId(movingMeetingId === m.meeting_id ? null : m.meeting_id) }}
                className="p-1 text-gray-400 hover:text-black transition-colors"
              >
                <FolderIcon size={11} />
              </button>
              {movingMeetingId === m.meeting_id && (
                <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[160px]" data-move-dropdown onClick={e => e.stopPropagation()}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-1">Move to…</p>
                  {collections.map(c => (
                    <button key={c.id} onClick={() => handleAssign(m.meeting_id, c.id)}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2 ${m.collection_id === c.id ? 'font-bold text-black' : 'text-gray-700'}`}>
                      <span>{c.emoji}</span> {c.name}
                      {m.collection_id === c.id && <Check size={10} className="ml-auto" />}
                    </button>
                  ))}
                  {m.collection_id != null && (
                    <>
                      <div className="border-t border-gray-100 my-1" />
                      <button onClick={() => handleAssign(m.meeting_id, null)}
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 flex items-center gap-2">
                        <X size={10} /> Remove from collection
                      </button>
                    </>
                  )}
                  {collections.length === 0 && (
                    <p className="text-xs text-gray-400 px-3 py-2">No collections yet — create one first.</p>
                  )}
                </div>
              )}
            </div>

            <button title="Rename" onClick={e => { e.stopPropagation(); setRenamingMeetingId(m.meeting_id); setNewMeetingName(m.source_filename || '') }}
              className="p-1 text-gray-400 hover:text-black transition-colors"><Edit2 size={11} /></button>
            <a href={downloadPdfUrl(m.meeting_id)} target="_blank" rel="noreferrer" title="Download PDF" onClick={e => e.stopPropagation()}
              className="p-1 text-gray-400 hover:text-black transition-colors"><FileDown size={11} /></a>
            <button disabled={deletingMeetingId === m.meeting_id} title="Delete"
              onClick={e => { e.stopPropagation(); handleDeleteMeeting(m.meeting_id) }}
              className="p-1 text-red-400 hover:text-red-600 disabled:opacity-50 transition-colors">
              {deletingMeetingId === m.meeting_id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
            </button>
          </div>

          {isActive && !renamingMeetingId && (
            <div className="px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-black text-white rounded-lg flex items-center gap-1 shrink-0">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> Active
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="section flex flex-col h-[340px] lg:h-[420px] xl:h-[calc(100vh-160px)] min-h-[340px]">
      {/* Header */}
      <div className="section-header">
        <Layers size={18} className="text-black shrink-0" />
        <h2 className="text-sm font-bold tracking-tight text-black min-w-0">Knowledge Base</h2>
        <div className="ml-auto flex items-center gap-2">
          {loading && <Loader2 size={13} className="animate-spin text-gray-400" />}
          <button
            title="New collection"
            onClick={() => setShowNewCol(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-black text-white hover:bg-gray-800 transition-colors"
          >
            <FolderPlus size={13} /> New
          </button>
        </div>
      </div>

      <div className="section-body p-2 scroll-y flex-1 min-h-0 overflow-y-auto">

        {/* New collection form */}
        {showNewCol && (
          <div className="mb-3 p-3 rounded-xl border border-black/10 bg-gray-50 space-y-2 animate-scale-in">
            <div className="flex items-center gap-2">
              <input value={newColEmoji} onChange={e => setNewColEmoji(e.target.value)} maxLength={4}
                className="w-10 text-center text-lg bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black" />
              <input autoFocus value={newColName} onChange={e => setNewColName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateCollection(); else if (e.key === 'Escape') setShowNewCol(false) }}
                placeholder="Collection name…"
                className="flex-1 text-sm font-semibold bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-black placeholder:text-gray-400" />
            </div>
            <input value={newColDesc} onChange={e => setNewColDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-black placeholder:text-gray-400" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNewCol(false)} className="px-3 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100">Cancel</button>
              <button onClick={handleCreateCollection} disabled={creatingCol || !newColName.trim()}
                className="px-3 py-1 text-xs rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1">
                {creatingCol ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />} Create
              </button>
            </div>
          </div>
        )}

        {/* Collections */}
        {collections.map(col => {
          const colMeetings = collectionMap[col.id] || []
          const isOpen = expanded.has(col.id)
          const isActiveCol = col.id === activeCollectionId
          return (
            <div key={col.id} className="mb-2">
              <div className={`flex items-center gap-2 px-2 py-2 rounded-xl transition-all cursor-pointer group ${
                isActiveCol ? 'bg-black text-white' : 'hover:bg-gray-100/80 text-gray-700'
              }`}>
                {/* Expand toggle */}
                <button onClick={() => toggleExpand(col.id)} className="shrink-0">
                  {isOpen
                    ? <ChevronDown size={14} className={isActiveCol ? 'text-white' : 'text-gray-400'} />
                    : <ChevronRight size={14} className={isActiveCol ? 'text-white' : 'text-gray-400'} />}
                </button>

                {/* Emoji + name — click to open collection view */}
                <button
                  className="flex-1 flex items-center gap-2 min-w-0 text-left"
                  onClick={() => { onOpenCollection(col); toggleExpand(col.id) }}
                >
                  <span className="text-base leading-none shrink-0">{col.emoji || '📁'}</span>
                  {renamingColId === col.id ? (
                    <input autoFocus value={newColRename} onChange={e => setNewColRename(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRenameCollection(col.id); else if (e.key === 'Escape') setRenamingColId(null) }}
                      className="flex-1 text-xs font-bold bg-white text-black border border-gray-300 rounded px-2 py-0.5 focus:outline-none"
                      onClick={e => e.stopPropagation()} />
                  ) : (
                    <span className={`text-xs font-bold truncate ${isActiveCol ? 'text-white' : ''}`}>{col.name}</span>
                  )}
                  <span className={`ml-auto text-[10px] font-semibold shrink-0 ${isActiveCol ? 'text-white/70' : 'text-gray-400'}`}>
                    {colMeetings.length}
                  </span>
                </button>

                {/* Chat across collection */}
                <button title="Chat with this collection"
                  onClick={e => { e.stopPropagation(); onOpenCollection(col) }}
                  className={`shrink-0 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${isActiveCol ? 'text-white hover:text-white/70' : 'text-gray-400 hover:text-black'}`}>
                  <MessageSquareDiff size={13} />
                </button>

                {/* Edit/delete */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button title="Rename" onClick={e => { e.stopPropagation(); setRenamingColId(col.id); setNewColRename(col.name) }}
                    className={`p-1 rounded transition-colors ${isActiveCol ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-black'}`}>
                    <Edit2 size={11} />
                  </button>
                  <button title="Delete collection" onClick={e => { e.stopPropagation(); handleDeleteCollection(col.id) }}
                    className={`p-1 rounded transition-colors ${isActiveCol ? 'text-red-300 hover:text-red-200' : 'text-red-400 hover:text-red-600'}`}>
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>

              {/* Meetings inside collection */}
              {isOpen && (
                <div className="ml-4 mt-1 space-y-1 pl-2 border-l-2 border-gray-100">
                  {colMeetings.length === 0 ? (
                    <p className="text-[11px] text-gray-400 py-2 px-2">No recordings yet — move some here.</p>
                  ) : (
                    colMeetings.map(m => <MeetingRow key={m.meeting_id} m={m} inCollection />)
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Divider + uncollected */}
        {uncollected.length > 0 && (
          <>
            {collections.length > 0 && (
              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                  <History size={10} /> Unorganized
                </span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
            )}
            <div className="space-y-1">
              {uncollected.map(m => <MeetingRow key={m.meeting_id} m={m} />)}
            </div>
          </>
        )}

        {/* Empty state */}
        {meetings.length === 0 && collections.length === 0 && !loading && (
          <div className="py-10 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <FolderOpen className="text-gray-400" size={20} />
            </div>
            <p className="text-sm font-medium text-gray-600">Your knowledge base is empty</p>
            <p className="text-xs text-gray-400 mt-1 max-w-[220px] leading-relaxed">
              Upload or record a session to get started. Organize sessions into collections to chat across them.
            </p>
          </div>
        )}

        {error && <div className="p-3 rounded-xl bg-gray-50 text-sm text-black border border-black font-medium text-center">{error}</div>}
      </div>
    </div>
  )
}
