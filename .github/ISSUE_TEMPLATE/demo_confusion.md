name: Demo Confusion Report
description: Report confusion or friction during a live or manual demo.
labels: [demo-feedback, friction]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for trying a Code Kit Ultra demo! Help us make the "First 10 Minutes" perfect.
  - type: dropdown
    id: demo-type
    attributes:
      label: Which demo were you running?
      options:
        - npm run demo (Main Showcase)
        - scripts/demo-crm.sh (Solar CRM)
        - scripts/demo-internal-tool.sh (Enterprise Ops)
        - Custom ck init
    validations:
      required: true
  - type: textarea
    id: confusion
    attributes:
      label: What part was confusing?
      description: Did a command fail? Did an artifact feel unclear? Was the output too noisy?
    validations:
      required: true
  - type: textarea
    id: expected-vs-actual
    attributes:
      label: What did you expect to see?
    validations:
      required: true
