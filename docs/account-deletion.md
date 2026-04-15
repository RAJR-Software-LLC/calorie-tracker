# Account Deletion Policy (Production Draft)

Last updated: 2026-04-15

## In-App Deletion

Users should be able to delete their account from within the app settings. If in-app deletion is not yet
available, provide a support workflow and delete requests within policy timelines.

## Deletion Request Data Required

- Email address associated with the account.
- Optional verification details to confirm identity.

## Deletion Timeline

- Acknowledge request within 7 days.
- Complete deletion within 30 days (or sooner where legally required).

## What Is Deleted

- Account profile data.
- User-created nutrition and log-entry data tied to the account.

## What May Be Retained

- Minimal records required for security, fraud prevention, tax, or legal compliance.
- Aggregated/de-identified analytics that cannot reasonably identify a user.

## How To Request Deletion

- In-app: Settings -> Legal and compliance -> Account deletion instructions.
- Web: publish deletion instructions at the public URL configured by
  `EXPO_PUBLIC_ACCOUNT_DELETION_URL`.

## Google Play / Apple Mapping Notes

- Google Play: ensure account deletion details are present in privacy policy and in-app.
- Apple: if account creation is supported, provide a compliant deletion path.
