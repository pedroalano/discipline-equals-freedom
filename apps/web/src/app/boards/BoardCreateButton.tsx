'use client';

export function BoardCreateButton() {
  function handleClick() {
    const title = window.prompt('Board title?');
    if (!title) return;
    fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
      .then(() => {
        window.location.reload();
      })
      .catch(() => {
        /* ignore */
      });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      New Board
    </button>
  );
}
