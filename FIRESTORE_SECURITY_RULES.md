# Firestore Security Rules Configuration

## Required Security Rules

To fix the "Missing or insufficient permissions" error, you need to configure Firestore security rules in the Firebase Console.

### For the "lumen" database:

1. Go to Firebase Console → Firestore Database → Rules
2. Select the "lumen" database (if using a named database)
3. Add the following rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read and write their own projects
    match /users/{userId}/projects/{projectId} {
      // Only allow access if the authenticated user's UID matches the userId in the path
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow users to read their own user document (if needed)
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### For the default database:

If you're using the default database instead of "lumen", use the same rules above.

## Testing the Rules

1. Go to Firebase Console → Firestore Database → Rules
2. Click "Rules Playground"
3. Test with:
   - Location: `users/{userId}/projects/{projectId}`
   - Authenticated: Yes
   - User ID: Your Firebase Auth UID
   - Operation: Read or Write

## Important Notes

- Users must be authenticated with Firebase Auth (not just custom auth)
- The `userId` in the document path must match `request.auth.uid`
- If you're using a named database ("lumen"), make sure to select it in the Firebase Console

## Troubleshooting

If you still get permission errors after setting these rules:

1. Verify the user is authenticated: Check `firebase.auth().currentUser` is not null
2. Verify the UID matches: The Firebase Auth UID should match the `userId` in the document path
3. Check database selection: Make sure you're editing rules for the correct database
4. Wait a few minutes: Security rules can take a few minutes to propagate

