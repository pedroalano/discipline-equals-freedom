interface UnsplashPhoto {
  url: string;
  author: string;
  authorUrl: string;
}

interface UnsplashApiResponse {
  urls: { full: string; regular: string };
  user: { name: string; links: { html: string } };
}

export async function getRandomPhoto(): Promise<UnsplashPhoto | null> {
  const accessKey = process.env['UNSPLASH_ACCESS_KEY'];
  if (!accessKey) return null;

  try {
    const res = await fetch(
      'https://api.unsplash.com/photos/random?query=nature&orientation=landscape',
      {
        headers: { Authorization: `Client-ID ${accessKey}` },
        next: { revalidate: 86400 },
      },
    );

    if (!res.ok) return null;

    const data = (await res.json()) as UnsplashApiResponse;
    return {
      url: data.urls.regular,
      author: data.user.name,
      authorUrl: data.user.links.html,
    };
  } catch {
    return null;
  }
}
