---
name: multi-step-wizard
domain: interactive
intent: Multi-step form flows with progress tracking and step validation
complexity: intermediate
components: Card, Progress, Button
---

# Multi-Step Wizard

## Layer Pattern
Multi-step wizard is a flow control layer that sequences form-layout steps
with progress tracking and navigation. It wraps existing form patterns.

## Architecture

### Step State
```
const [currentStep, setCurrentStep] = useState(0)
const [stepData, setStepData] = useState<Record<number, FormData>>({})
const totalSteps = steps.length
```

### Step Navigation
- Next: validate current step → save step data → setCurrentStep(s => s + 1)
- Back: setCurrentStep(s => s - 1) — no validation needed
- Skip (optional): mark step skipped, advance
- Submit: final step triggers form submission with merged stepData

### Progress Display
- Progress bar: Progress value={((currentStep + 1) / totalSteps) * 100}
- Step indicators: flex row of numbered circles, filled up to currentStep
- Text: "Step 2 of 4" (text-sm text-muted-foreground)

## Patterns

### Linear Wizard
- Steps proceed in order, no skipping
- Card with CardHeader (step title + description) + CardContent (form fields) +
  CardFooter (Back + Next/Submit Buttons)
- Progress bar at top of Card
- Final step: summary of all entered data + Submit Button

### Branching Wizard
- Step sequence changes based on answers
- Step map: array of step configs with `nextStep` function
- Conditional rendering based on previous step data

### Sidebar Steps
- Vertical step list on left (like sidebar-nav), content on right
- Steps show: number + title + checkmark when complete
- Click completed step to review/edit (but not skip ahead)

## Validation
- Per-step validation before allowing Next
- Zod schema per step for field validation
- Show errors inline within current step
- Don't validate future steps — only current + past

## Anti-Patterns
- ❌ No progress indicator — users must know where they are and how much is left
- ❌ No Back button — users must be able to revise previous steps
- ❌ Losing data on Back — always preserve step data when navigating
- ❌ Validating all steps upfront — only validate current step on Next

## Composition Notes
- Each step's content reuses form-layout patterns
- Final summary step can reuse data-table or Card list for review
- Onboarding flows use wizard pattern for initial setup
- Auth registration can be split into wizard steps (credentials → profile → preferences)
