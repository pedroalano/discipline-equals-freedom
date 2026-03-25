'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export function BoardCreateButton() {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: trimmed }),
    });
    setTitle('');
    setAdding(false);
    router.refresh();
  }

  function handleCancel() {
    setTitle('');
    setAdding(false);
  }

  if (adding) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSubmit();
            if (e.key === 'Escape') handleCancel();
          }}
          placeholder="Board title..."
          className="text-sm px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500 w-48"
        />
        <button
          type="button"
          onClick={() => void handleSubmit()}
          className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          Create
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="px-3 py-2 text-gray-600 text-sm rounded-lg hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setAdding(true)}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
    >
      + New Board
    </button>
  );
}
