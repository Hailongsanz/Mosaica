/**
 * Cloudinary Image Upload Service
 * Used for profile picture uploads
 */

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/**
 * Upload an image to Cloudinary
 * @param {File} file - The image file to upload
 * @returns {Promise<{url: string, publicId: string}>} The uploaded image URL and public ID
 */
export const uploadImage = async (file) => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary configuration is missing. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env file.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', 'profile-pictures');

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to upload image');
    }

    const data = await response.json();
    
    return {
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      format: data.format,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Upload profile picture with automatic resizing
 * @param {File} file - The image file to upload
 * @returns {Promise<{url: string, publicId: string}>}
 */
export const uploadProfilePicture = async (file) => {
  const result = await uploadImage(file);
  
  // Generate optimized URL with transformations (resize to 400x400, crop to face)
  const optimizedUrl = result.url.replace(
    '/upload/',
    '/upload/w_400,h_400,c_fill,g_face,q_auto,f_auto/'
  );
  
  return {
    file_url: optimizedUrl,
    original_url: result.url,
    public_id: result.publicId,
  };
};

export const cloudinaryService = {
  uploadImage,
  uploadProfilePicture,
};
