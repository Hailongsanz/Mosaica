# Firebase Storage CORS Fix

## Problem
Profile picture uploads are failing with CORS errors because Firebase Storage doesn't allow requests from localhost.

## Solution

### Option 1: Using Firebase Console (Easier)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **mosaica-dcb0a**
3. Go to **Storage** → **Rules**
4. Update your Storage Rules to:

```
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;  // Allow all reads
      allow write: if request.auth != null;  // Allow writes for authenticated users
    }
  }
}
```

5. Click **Publish**

### Option 2: Using Google Cloud SDK (More Control)

1. Install Google Cloud SDK if you haven't:
   - Download from: https://cloud.google.com/sdk/docs/install
   - Or use: `choco install gcloudsdk` (if you have Chocolatey)

2. Open PowerShell and run:

```powershell
# Login to Google Cloud
gcloud auth login

# Set your project
gcloud config set project mosaica-dcb0a

# Apply CORS configuration
gsutil cors set cors.json gs://mosaica-dcb0a.firebasestorage.app
```

3. Verify CORS was applied:

```powershell
gsutil cors get gs://mosaica-dcb0a.firebasestorage.app
```

### Option 3: Quick Fix - Add Your Production Domain

If you're deploying to a production domain, add it to Firebase:

1. Go to Firebase Console → Authentication → Settings
2. Under "Authorized domains", add:
   - `localhost`
   - Your production domain (e.g., `myapp.com`)

## After Fixing

1. Restart your dev server: `npm run dev`
2. Try uploading a profile picture again
3. It should work without CORS errors

## Why This Happened

Firebase Storage blocks requests from `localhost` by default for security. The CORS configuration tells Firebase to allow uploads from your local development server.
