export type ZlecenieStatus = 'oczekuje' | 'w_trakcie' | 'gotowe';

export interface Zlecenie {
  id: string;
  hash: string;
  bike_model: string;
  customer_phone: string;
  status: ZlecenieStatus;
  created_at: string;
}

export interface ZlecenieItem {
  id: string;
  zlecenie_id: string;
  label: string;
  is_done: boolean;
  done_at: string | null;
  sort_order: number;
}

export interface UpdatePhoto {
  id: string;
  update_id: string;
  storage_path: string;
  created_at: string;
}

export interface ZlecenieUpdate {
  id: string;
  zlecenie_id: string;
  item_id: string | null;
  note: string | null;
  created_at: string;
  update_photos: UpdatePhoto[];
}

export interface CatalogItem {
  id: string;
  category: string;
  label: string;
  is_package: boolean;
  parent_id: string | null;
  sort_order: number;
  children?: CatalogItem[];
}
