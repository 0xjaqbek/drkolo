-- Allow anonymous deletes on zlecenia (cascades to items, updates, photos via FK)
create policy "anon_delete_zlecenia" on zlecenia for delete using (true);
create policy "anon_delete_items" on zlecenie_items for delete using (true);
create policy "anon_delete_updates" on zlecenie_updates for delete using (true);
create policy "anon_delete_photos" on update_photos for delete using (true);
