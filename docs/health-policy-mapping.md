# Health Policy Mapping (Apple + Google Play)

Last updated: 2026-04-15

## App Classification

- Product intent: nutrition and calorie tracking for general wellness.
- Store classification target: Health and Fitness / Nutrition and Weight Management.
- Medical device status target: not a regulated medical device.

## Feature-To-Policy Mapping

| App feature | Apple guideline alignment | Google Play alignment | Required action |
| --- | --- | --- | --- |
| Calorie logging and summaries | Health data is sensitive under 5.1.3 | Health Apps policy in scope | Keep wellness-only claims and privacy disclosures |
| Calorie planning calculators | Avoid medical diagnosis/treatment claims | No misleading medical functionality | Include non-medical disclaimer |
| Family/shared tracking | Personal data minimization and clear purpose | Privacy + sensitive data disclosures | Document data sharing intent and controls |
| Auth and profile data | Data collection/storage transparency | Data Safety + Health declaration | Keep store and in-app policy text consistent |

## Mandatory Store Text Controls

- Must include:
  - General wellness framing.
  - "Not a medical device" disclaimer.
  - "Consult a healthcare professional" language.
- Must avoid:
  - Claims to diagnose, treat, cure, or prevent disease.
  - Unsupported efficacy claims.
  - Misleading medical language in screenshots, subtitles, or release notes.

## Apple Guideline 5.1.3 Controls

- Disclose specific health-related data collected in privacy materials.
- Do not use health-related data for advertising/marketing/data-mining purposes.
- Apply compliance review for any future HealthKit or medical-adjacent integrations.

## Google Play Health Apps Controls

- Complete Health Apps declaration for the app.
- Select Nutrition and Weight Management category.
- Provide public, non-geofenced privacy policy URL in Play Console.
- Keep Data Safety form aligned with actual data collection/use/sharing behavior.

## Submission Metadata Checklist

- Privacy policy URL (public, accessible).
- Terms URL.
- Account deletion URL/instructions.
- Support contact URL/email.
- Age/content declarations.
- Accurate Health Apps declaration in Play Console.

## Pre-Submission Review Gate

Before each submission, verify:

1. Listing copy uses wellness-only claims.
2. Disclaimers appear in store listing and in-app legal screen.
3. Privacy policy and Data Safety answers match app behavior.
4. Any new SDK does not process health-related data for prohibited uses.
