name: Success Story
description: Share your successful run or artifact from Code Kit Ultra!
labels: [community, success]
body:
  - type: markdown
    attributes:
      value: |
        We want to celebrate your wins! Tell us what you built.
  - type: input
    id: project-name
    attributes:
      label: What did you build?
      placeholder: e.g., "A Slack bot for cat GIFs"
    validations:
      required: true
  - type: textarea
    id: outcome
    attributes:
      label: How did Code Kit Ultra help?
      description: Faster architecture? Better skill matching?
    validations:
      required: true
  - type: textarea
    id: artifacts
    attributes:
      label: Links to screenshots or code (optional)
