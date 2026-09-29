// Loads the catalogue into the *emulator*, not the real project.
// Run `npm run emu` in one terminal, then `npm run emu:seed` in another.
//
// Kept separate from import-to-firestore.mjs so there is no way to point a
// seeding run at production by forgetting a flag.

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099'
process.env.FIREBASE_PROJECT_ID ??= 'demo-hr-shoe-mart'

await import('./import-to-firestore.mjs')
