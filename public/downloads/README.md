# APK Downloads

Place your APK file here:
- `cmda-mobile.apk`

This file will be accessible at:
`https://api.cmdanigeria.net/downloads/cmda-mobile.apk`

## Updating the APK

1. Build your APK using: `eas build --platform android --profile production`
2. Download the built APK from EAS
3. Replace the `cmda-mobile.apk` file in this directory
4. Deploy to Digital Ocean

## File Size Considerations

- Keep APK size reasonable (< 50MB recommended)
- Consider using Android App Bundles (AAB) for Play Store
- For direct downloads, APK is the standard format
