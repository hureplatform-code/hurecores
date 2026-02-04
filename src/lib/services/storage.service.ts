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
            console.log('Starting file upload:', { fileName: file.name, fileSize: file.size, path, bucket });
            
            // 1. Upload file
            const { data, error } = await supabase
                .storage
                .from(bucket)
                .upload(path, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (error) {
                console.error('Supabase upload error:', error, 'Error code:', (error as any)?.statusCode);
                // Provide more helpful error messages
                let errorMessage = error.message;
                if (error.message?.includes('not allowed') || error.message?.includes('policy')) {
                    errorMessage = 'Upload permission denied. Please contact support.';
                } else if (error.message?.includes('Payload too large') || error.message?.includes('size')) {
                    errorMessage = 'File is too large. Maximum size is 50MB.';
                } else if (error.message?.includes('Invalid')) {
                    errorMessage = 'Invalid file type. Please upload PDF, JPG, or PNG files.';
                }
                return { success: false, error: errorMessage };
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
    },

    /**
     * Get a signed URL for private file access
     * @param path The path to the file
     * @param bucket The bucket name
     * @param expiresIn Expiry time in seconds (default: 1 hour)
     */
    async getSignedUrl(path: string, bucket: string = 'documents', expiresIn: number = 3600): Promise<{ success: boolean; url?: string; error?: string }> {
        try {
            const { data, error } = await supabase
                .storage
                .from(bucket)
                .createSignedUrl(path, expiresIn);

            if (error) {
                console.error('Signed URL error:', error);
                return { success: false, error: error.message };
            }

            return { success: true, url: data.signedUrl };
        } catch (error: any) {
            console.error('Storage service error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Extract the storage path from a public URL
     * Converts: https://xxx.supabase.co/storage/v1/object/public/documents/path/file.pdf
     * To: path/file.pdf
     */
    extractPathFromUrl(url: string): string | null {
        try {
            const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
            return match ? match[1] : null;
        } catch {
            return null;
        }
    }
};
