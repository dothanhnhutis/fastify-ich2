export interface FileUpload {
  id: string;
  original_name: string;
  mime_type: string;
  destination: string;
  file_name: string;
  path: string;
  size: string;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
  // deleted_at: Date;
  // category_id: string | null;
}
