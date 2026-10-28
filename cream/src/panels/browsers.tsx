// Paged result views for each open source, reused by Elements, Photos, Videos, Audio and Backgrounds.
import { usePaged } from '../assets/usePaged';
import { searchAudio, searchImages, type AudioCategory, type AudioLength, type ImageQuery, type PhotoItem } from '../assets/openverse';
import { searchVideos } from '../assets/wikimedia';
import { browseGroup, searchGroup, type IconGroup } from '../assets/iconify';
import { AudioList, IconGrid, PagedFooter, PhotoMasonry, VideoGrid } from './common';

export function PhotoResults({ query, onPick }: { query: ImageQuery; onPick?: (p: PhotoItem) => void }) {
  const key = JSON.stringify(query);
  const p = usePaged(key, (page, signal) => searchImages(query, page, signal), (x) => x.id);
  return (
    <>
      <PhotoMasonry items={p.items} onPick={onPick} />
      <PagedFooter p={p} emptyText={<>No photos found for “{query.q}”. Try different keywords or remove filters.</>} />
    </>
  );
}

export function VideoResults({ q }: { q: string }) {
  const p = usePaged(q || 'nature', (page, signal) => searchVideos(q || 'nature', page, signal), (x) => x.id);
  return (
    <>
      <VideoGrid items={p.items} />
      <PagedFooter p={p} emptyText={<>No videos found for “{q}”.</>} />
    </>
  );
}

export function AudioResults({ q, category, length }: { q: string; category?: AudioCategory; length?: AudioLength }) {
  const key = JSON.stringify([q, category, length]);
  const p = usePaged(key, (page, signal) => searchAudio({ q, category, length }, page, signal), (x) => x.id);
  return (
    <>
      <AudioList items={p.items} />
      <PagedFooter p={p} emptyText={<>No audio found for “{q}”.</>} />
    </>
  );
}

export function IconResults({ group, q, cols }: { group: IconGroup; q: string; cols?: number }) {
  const searchP = usePaged(q.trim() ? `${group}|${q}` : null, (page, signal) => searchGroup(group, q.trim(), page, signal), (x) => x.id);
  const browseP = usePaged(q.trim() ? null : `browse|${group}`, (page, signal) => browseGroup(group, page, signal), (x) => x.id);
  const p = q.trim() ? searchP : browseP;
  return (
    <>
      <IconGrid items={p.items} mono={group === 'icons'} cols={cols} />
      <PagedFooter p={p} emptyText={<>No {group === '3d' ? '3D graphics' : group} found for “{q}”.</>} />
    </>
  );
}
