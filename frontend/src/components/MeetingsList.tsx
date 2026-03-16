import React from 'react'
import { listMeetings, downloadPdfUrl, renameRecord, deleteRecord } from '../lib/api'
import type { MeetingListItem } from '../types'
import { FileDown, ExternalLink, History, Calendar, Edit2, Loader2, Check, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

export default function MeetingsList({
  onOpen,
  onDelete,
  activeId,
  reloadSignal, // 🔁 new prop to trigger re-fetch
}: {
  onOpen: (meeting_id: string, meeting_title: string) => void
  onDelete?: (meeting_id: string) => void
  activeId?: string | null
  reloadSignal?: number
}) {
  const [items, setItems] = React.useState<MeetingListItem[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const [renamingId, setRenamingId] = React.useState<string | null>(null)
  const [newName, setNewName] = React.useState('')
  const [isRenaming, setIsRenaming] = React.useState(false)
  
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const fetchMeetings = React.useCallback(() => {
    setLoading(true)
    setError(null)
    listMeetings()
      .then((data) => setItems(data || []))
      .catch((e: any) => setError(e?.message || 'Failed to load history'))
      .finally(() => setLoading(false))
  }, [])

  async function handleRenameSubmit(id: string) {
    if (!newName.trim()) {
      setRenamingId(null)
      return
    }
    setIsRenaming(true)
    try {
      await renameRecord(id, newName.trim())
      setItems(prev => prev.map(m => m.meeting_id === id ? { ...m, source_filename: newName.trim() } : m))
    } catch (e: any) {
      console.error(e)
    } finally {
      setIsRenaming(false)
      setRenamingId(null)
    }
  }

  async function handleDeleteClick(id: string) {
    if (!window.confirm("Are you sure you want to permanently delete this record? This action cannot be undone.")) return;
    setDeletingId(id)
    try {
      await deleteRecord(id)
      setItems(prev => prev.filter(m => m.meeting_id !== id))
      if (onDelete) onDelete(id)
    } catch (e: any) {
      console.error(e)
      alert(e?.message || 'Failed to delete record')
    } finally {
      setDeletingId(null)
    }
  }

  // Initial load + reload on signal change
  React.useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings, reloadSignal])

  return (
    <div className="section flex flex-col h-[400px]">
      <div className="section-header">
        <History size={18} className="text-black" />
        <h2 className="text-sm font-bold tracking-tight text-black">Recent Audios/Videos</h2>
        <span className="ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-600 border border-gray-200">
          {loading ? (
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse"></span>Loading</span>
          ) : (
            `${items.length} records`
          )}
        </span>
      </div>

      <div className="section-body p-2 scroll-y">
        <div className="space-y-1.5">
          {items.map((m, i) => {
            const isActive = m.meeting_id === activeId
            return (
              <div
                key={m.meeting_id}
                className={`group animate-scale-in flex flex-col p-3 rounded-xl border transition-all duration-300 relative overflow-hidden ${isActive
                  ? 'bg-gray-100/80 border-gray-300 shadow-sm ring-1 ring-black/10'
                  : 'bg-white/40 border-transparent hover:bg-white hover:border-gray-200 hover:shadow-sm cursor-pointer'
                  }`}
                style={{ animationDelay: `${i * 0.05}s` }}
                onClick={(e) => {
                  // Ignore clicks if they clicked a button directly
                  if (isActive || (e.target as HTMLElement).closest('button, a')) return;
                  onOpen(m.meeting_id, m.source_filename || 'Untitled Meeting')
                }}
              >
                {/* Active subtle background accent */}
                {isActive && <div className="absolute inset-y-0 left-0 w-1 bg-black shadow-[0_0_8px_rgba(0,0,0,0.4)]"></div>}

                <div className={`flex flex-col gap-2 ${isActive ? 'pl-2' : ''}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {renamingId === m.meeting_id ? (
                        <div className="flex items-center gap-2 mb-1 z-20 relative">
                          <input
                            type="text"
                            autoFocus
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleRenameSubmit(m.meeting_id)
                              else if (e.key === 'Escape') setRenamingId(null)
                            }}
                            className="w-full text-sm font-semibold text-black bg-white border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-black"
                            onClick={e => e.stopPropagation()}
                          />
                          <button 
                            disabled={isRenaming}
                            onClick={(e) => { e.stopPropagation(); handleRenameSubmit(m.meeting_id) }}
                            className="p-1 rounded bg-black text-white hover:bg-gray-800 disabled:opacity-50"
                          >
                            {isRenaming ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          </button>
                        </div>
                      ) : (
                        <div className={`text-sm font-semibold transition-colors flex items-center justify-between gap-2 ${isActive ? 'text-black' : 'text-gray-700 group-hover:text-black'}`}>
                          <span className="truncate" title={m.source_filename || 'Untitled Record'}>
                            {m.source_filename || 'Untitled Record'}
                          </span>
                          
                          <div className="flex items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenamingId(m.meeting_id);
                                setNewName(m.source_filename || 'Untitled Record');
                              }}
                              className="p-1 text-gray-400 hover:text-black transition-colors"
                              title="Rename"
                            >
                              <Edit2 size={12} />
                            </button>
                            
                            <button
                              disabled={deletingId === m.meeting_id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(m.meeting_id);
                              }}
                              className="p-1 text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              {deletingId === m.meeting_id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-gray-500">
                        <Calendar size={10} />
                        {format(new Date(m.created_at), 'MMM d, yyyy • h:mm a')}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <a
                        href={downloadPdfUrl(m.meeting_id)}
                        target="_blank" rel="noreferrer"
                        className={`p-1.5 rounded-lg transition-colors ${isActive ? 'text-gray-500 hover:text-black hover:bg-gray-200' : 'text-gray-400 hover:text-black hover:bg-gray-50 opacity-0 group-hover:opacity-100'}`}
                        title="Download PDF"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FileDown size={14} />
                      </a>

                      {!isActive ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpen(m.meeting_id, m.source_filename || 'Untitled Record')
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-black hover:border-black/50 transition-all opacity-0 group-hover:opacity-100 shadow-sm flex items-center gap-1.5"
                        >
                          Chat <ExternalLink size={12} />
                        </button>
                      ) : (
                        <div className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase bg-black text-white rounded-lg flex items-center gap-1 shadow-sm">
                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div> Active
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {items.length === 0 && !loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <History className="text-gray-400" size={20} />
              </div>
              <p className="text-sm font-medium text-gray-600">No history yet</p>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px]">Upload your first audio or video to see it appear here.</p>
            </div>
          )}
          {error && <div className="p-4 rounded-xl bg-gray-50 text-sm text-black border border-black font-medium text-center animate-scale-in">{error}</div>}
        </div>
      </div>
    </div>
  )
}
