import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage, auth } from './config';

export interface UploadResult {
  file_url: string;
  filename: string;
  size: number;
}

export const storageService = {
  // Upload file to Firebase Storage
  async uploadFile(file: File, path: string = 'uploads'): Promise<UploadResult> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Create unique filename with timestamp
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;
    const filepath = `${user.uid}/${path}/${filename}`;

    try {
      // Upload file to Firebase Storage
      const storageRef = ref(storage, filepath);
      const snapshot = await uploadBytes(storageRef, file);

      // Get download URL
      const downloadUrl = await getDownloadURL(snapshot.ref);

      return {
        file_url: downloadUrl,
        filename: filename,
        size: file.size,
      };
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error(`Failed to upload file: ${error}`);
    }
  },

  // Upload profile picture
  async uploadProfilePicture(file: File): Promise<UploadResult> {
    return this.uploadFile(file, 'profile-pictures');
  },

  // Delete file from Storage
  async deleteFile(filepath: string): Promise<void> {
    try {
      const fileRef = ref(storage, filepath);
      await deleteObject(fileRef);
    } catch (error) {
      console.error('File deletion error:', error);
      throw new Error(`Failed to delete file: ${error}`);
    }
  },

  // Upload multiple files
  async uploadMultiple(
    files: File[],
    path: string = 'uploads'
  ): Promise<UploadResult[]> {
    return Promise.all(
      files.map((file) => this.uploadFile(file, path))
    );
  },
};
