import { supabase } from '@/lib/supabase';
import type { UpdatePhoto } from '@/lib/types';

interface PhotoGalleryProps {
  photos: UpdatePhoto[];
}

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  if (photos.length === 0) return null;

  return (
    <div className="flex gap-2 flex-wrap mt-2">
      {photos.map(photo => {
        const { data } = supabase.storage
          .from('zlecenie-photos')
          .getPublicUrl(photo.storage_path);
        return (
          <a key={photo.id} href={data.publicUrl} target="_blank" rel="noopener noreferrer">
            <img
              src={data.publicUrl}
              alt="Zdjęcie serwisu"
              className="w-20 h-20 object-cover rounded border"
            />
          </a>
        );
      })}
    </div>
  );
}
