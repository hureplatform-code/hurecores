import { supabase } from '../supabase';

export const storageService = {
    /**
     * Upload a file to Supabase Storage
     * @param file The file object to upload
     * @param path The path including filename (e.g. 'organizations/org123/doc.pdf')
     * @param bucket The bucket name (default: 'documents')
     */
    async uploadFile(file: File, path: string, bucket: string = 'documents'): Promise<{ success: boolean; url?: string; error?: string }> {
        try {
            // 1. Upload file
            const { data, error } = await supabase
                .storage
                .from(bucket)
                .upload(path, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (error) {
                console.error('Supabase upload error:', error);
                return { success: false, error: error.message };
            }

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase
                .storage
                .from(bucket)
                .getPublicUrl(path);

            return { success: true, url: publicUrl };
        } catch (error: any) {
            console.error('Storage service error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Delete a file from Supabase Storage
     */
    async deleteFile(path: string, bucket: string = 'documents'): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabase
                .storage
                .from(bucket)
                .remove([path]);

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
};
