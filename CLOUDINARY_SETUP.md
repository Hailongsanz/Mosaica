# Cloudinary Setup Guide

## Step 1: Create Cloudinary Account (2 minutes)

1. Go to: https://cloudinary.com/users/register_free
2. Sign up with your email (no credit card required)
3. Verify your email
4. You'll be redirected to your Dashboard

## Step 2: Get Your Credentials (1 minute)

On your Cloudinary Dashboard, you'll see:

```
Cloud name: your_cloud_name
API Key: 123456789012345
API Secret: AbCdEfGhIjKlMnOpQrStUvWxYz
```

**Copy your Cloud Name** - you'll need it next.

## Step 3: Create Upload Preset (2 minutes)

1. In Cloudinary Dashboard, click **Settings** (gear icon in top right)
2. Click the **Upload** tab on the left
3. Scroll down to **Upload presets**
4. Click **Add upload preset**
5. Set these values:
   - **Preset name**: `profile_pictures`
   - **Signing Mode**: `Unsigned` (important!)
   - **Folder**: `profile-pictures`
   - **Access mode**: `public`
6. Click **Save**

## Step 4: Add to .env File (1 minute)

1. Open your `.env` file in the project root
2. Add these two lines (replace `your_cloud_name` with your actual Cloud Name from Step 2):

```env
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=profile_pictures
```

Example:
```env
VITE_CLOUDINARY_CLOUD_NAME=dk1abc2def
VITE_CLOUDINARY_UPLOAD_PRESET=profile_pictures
```

3. **Save the file**

## Step 5: Restart Dev Server

Stop your dev server (Ctrl+C) and start it again:

```bash
npm run dev
```

## Step 6: Test Upload

1. Go to Settings in your app
2. Click on your profile picture area
3. Select an image
4. It should upload instantly!

---

## Troubleshooting

**"Cloudinary configuration is missing" error:**
- Make sure your `.env` file has both `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET`
- Restart your dev server after adding the variables

**"Upload preset must be whitelisted" error:**
- Go back to Cloudinary Dashboard → Settings → Upload → Upload presets
- Make sure `profile_pictures` preset has **Signing Mode: Unsigned**

**Image not showing after upload:**
- Check browser console for errors
- Make sure the upload succeeded (you should see a success message)

---

## What Cloudinary Does

- ✅ Stores your images securely
- ✅ Automatically optimizes images (smaller file sizes)
- ✅ Automatically resizes to 400x400px for profile pictures
- ✅ Serves images via fast CDN
- ✅ 25GB storage free (way more than enough for profile pictures)

You're all set! 🎉
