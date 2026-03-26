'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BoardSummaryResponse } from '@zenfocus/types';

const COLOR_OPTIONS = [
  { key: 'indigo', swatch: 'bg-indigo-500', label: 'Indigo' },
  { key: 'rose', swatch: 'bg-rose-500', label: 'Rose' },
  { key: 'amber', swatch: 'bg-amber-500', label: 'Amber' },
  { key: 'emerald', swatch: 'bg-emerald-500', label: 'Emerald' },
  { key: 'sky', swatch: 'bg-sky-500', label: 'Sky' },
  { key: 'violet', swatch: 'bg-violet-500', label: 'Violet' },
];

interface BoardSettingsPanelProps {
  board: BoardSummaryResponse;
  onClose: () => void;
}

export function BoardSettingsPanel({ board, onClose }: BoardSettingsPanelProps) {
  const router = useRouter();
  const [title, setTitle] = useState(board.title);
  const [description, setDescription] = useState(board.description ?? '');
  const [color, setColor] = useState<string | null>(board.color);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/boards/${board.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() || board.title, description, color }),
    });
    router.refresh();
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-80 bg-white z-50 shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Board Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Title */}
          <div>
            <label htmlFor="board-title" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              id="board-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="board-description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Description
            </label>
            <textarea
              id="board-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Add a description…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Theme */}
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-2">Theme</span>
            <div className="flex gap-3 flex-wrap">
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setColor(option.key)}
                  title={option.label}
                  aria-label={option.label}
                  className={`w-8 h-8 rounded-full ${option.swatch} transition-all ${
                    color === option.key ? 'ring-2 ring-offset-2 ring-gray-600' : ''
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="w-full rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium py-2 transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </>
  );
}
